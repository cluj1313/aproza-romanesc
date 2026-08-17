const path = require('path');
const fs = require('fs');
const { Pool } = require('pg');

const uploadsDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const usePg = !!process.env.DATABASE_URL;

function convertPlaceholders(sql) {
  let idx = 0;
  return sql.replace(/\?/g, () => `$${++idx}`);
}

if (usePg) {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  const db = {
    pool,

    prepare(sql) {
      const pgSql = convertPlaceholders(sql);
      const isInsert = /^\s*INSERT/i.test(sql);
      const insertSql = isInsert && !/RETURNING/i.test(sql) ? pgSql + ' RETURNING id' : pgSql;

      return {
        async get(...params) {
          const { rows } = await pool.query(insertSql, params);
          return rows[0] || undefined;
        },
        async all(...params) {
          const { rows } = await pool.query(insertSql, params);
          return rows;
        },
        async run(...params) {
          const { rows, rowCount } = await pool.query(insertSql, params);
          return { changes: rowCount, lastInsertRowid: rows[0] ? rows[0].id : undefined };
        }
      };
    },

    async exec(sql) {
      const statements = sql.split(/;\s*\n/).filter(s => s.trim());
      for (const stmt of statements) {
        if (stmt.trim()) await pool.query(stmt.trim());
      }
    },

    function() {},

    async transaction(fn) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const txDb = {
          prepare(sql) {
            const pgSql = convertPlaceholders(sql);
            const isInsert = /^\s*INSERT/i.test(sql);
            const insertSql = isInsert && !/RETURNING/i.test(sql) ? pgSql + ' RETURNING id' : pgSql;
            return {
              async get(...params) { return (await client.query(insertSql, params)).rows[0] || undefined; },
              async all(...params) { return (await client.query(insertSql, params)).rows; },
              async run(...params) {
                const { rows, rowCount } = await client.query(insertSql, params);
                return { changes: rowCount, lastInsertRowid: rows[0] ? rows[0].id : undefined };
              }
            };
          }
        };
        const result = await fn(txDb);
        await client.query('COMMIT');
        return result;
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    }
  };

  async function initDb() {
    await pool.query('CREATE EXTENSION IF NOT EXISTS unaccent');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_sessions (
        sid VARCHAR NOT NULL COLLATE "default",
        sess JSON NOT NULL,
        expire TIMESTAMPTZ NOT NULL,
        PRIMARY KEY (sid)
      )
    `);
    await pool.query('CREATE INDEX IF NOT EXISTS user_sessions_expire_idx ON user_sessions(expire)');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        role TEXT NOT NULL CHECK (role IN ('producer', 'customer')),
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        phone TEXT,
        is_admin INTEGER NOT NULL DEFAULT 0,
        is_mock INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS producers (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        owner_name TEXT NOT NULL DEFAULT '',
        description TEXT NOT NULL DEFAULT '',
        county TEXT NOT NULL DEFAULT '',
        locality TEXT NOT NULL DEFAULT '',
        address TEXT NOT NULL DEFAULT '',
        phone TEXT NOT NULL DEFAULT '',
        whatsapp TEXT NOT NULL DEFAULT '',
        lat REAL,
        lng REAL,
        avatar_url TEXT NOT NULL DEFAULT '',
        cover_url TEXT NOT NULL DEFAULT '',
        is_mock INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
        producer_id INTEGER NOT NULL REFERENCES producers(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        price REAL NOT NULL,
        unit TEXT NOT NULL DEFAULT 'kg',
        category TEXT NOT NULL DEFAULT 'Altele',
        image_url TEXT NOT NULL DEFAULT '',
        available INTEGER NOT NULL DEFAULT 1,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS stores (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        county TEXT NOT NULL,
        city TEXT NOT NULL,
        address TEXT NOT NULL DEFAULT '',
        phone TEXT NOT NULL DEFAULT '',
        lat REAL NOT NULL,
        lng REAL NOT NULL
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS announcements (
        id SERIAL PRIMARY KEY,
        producer_id INTEGER NOT NULL REFERENCES producers(id) ON DELETE CASCADE,
        type TEXT NOT NULL CHECK (type IN ('discount', 'offer', 'free_shipping', 'vacation', 'other')),
        title TEXT NOT NULL,
        message TEXT NOT NULL DEFAULT '',
        percent INTEGER,
        active INTEGER NOT NULL DEFAULT 1,
        featured INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS reviews (
        id SERIAL PRIMARY KEY,
        producer_id INTEGER NOT NULL REFERENCES producers(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
        comment TEXT NOT NULL DEFAULT '',
        reply TEXT NOT NULL DEFAULT '',
        reply_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        producer_id INTEGER REFERENCES producers(id) ON DELETE CASCADE,
        target_user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        type TEXT NOT NULL DEFAULT 'fresh',
        title TEXT NOT NULL,
        message TEXT NOT NULL DEFAULT '',
        "read" INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        status TEXT NOT NULL DEFAULT 'placed',
        total REAL NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS order_items (
        id SERIAL PRIMARY KEY,
        order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
        product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        product_name TEXT NOT NULL,
        producer_id INTEGER NOT NULL REFERENCES producers(id) ON DELETE CASCADE,
        producer_name TEXT NOT NULL,
        price REAL NOT NULL,
        unit TEXT NOT NULL DEFAULT 'kg',
        qty REAL NOT NULL DEFAULT 1,
        image_url TEXT NOT NULL DEFAULT ''
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS password_resets (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        code TEXT NOT NULL,
        method TEXT NOT NULL DEFAULT 'email',
        expires_at TIMESTAMPTZ NOT NULL,
        "used" INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS site_announcements (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        message TEXT NOT NULL DEFAULT '',
        active INTEGER NOT NULL DEFAULT 1,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    try {
      await pool.query('CREATE UNIQUE INDEX IF NOT EXISTS idx_users_phone ON users(phone) WHERE phone IS NOT NULL');
    } catch (e) {
      // index may already exist
    }

    const alterCols = [
      'ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin INTEGER NOT NULL DEFAULT 0',
      'ALTER TABLE users ADD COLUMN IF NOT EXISTS is_mock INTEGER NOT NULL DEFAULT 0',
      'ALTER TABLE producers ADD COLUMN IF NOT EXISTS is_mock INTEGER NOT NULL DEFAULT 0',
    ];
    for (const sql of alterCols) {
      try { await pool.query(sql); } catch (e) { /* column already exists */ }
    }
  }

  const dbReady = initDb().catch(err => {
    console.error('Eroare la inițializarea PostgreSQL:', err.message);
    process.exit(1);
  });

  db.ready = dbReady;
  module.exports = db;

} else {
  const Database = require('better-sqlite3');
  const dataDir = path.join(__dirname, 'data');
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

  const db = new Database(path.join(dataDir, 'aprozar-romanesc.db'));
  db.pragma('journal_mode = WAL');

  db.function('unaccent', (s) => {
    if (s == null) return s;
    return String(s)
      .toLowerCase()
      .replace(/ă/g, 'a').replace(/â/g, 'a').replace(/î/g, 'i')
      .replace(/ș/g, 's').replace(/ş/g, 's').replace(/ț/g, 't').replace(/ţ/g, 't');
  });

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      role TEXT NOT NULL CHECK (role IN ('producer', 'customer')),
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS producers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      owner_name TEXT NOT NULL DEFAULT '',
      description TEXT NOT NULL DEFAULT '',
      county TEXT NOT NULL DEFAULT '',
      locality TEXT NOT NULL DEFAULT '',
      address TEXT NOT NULL DEFAULT '',
      phone TEXT NOT NULL DEFAULT '',
      whatsapp TEXT NOT NULL DEFAULT '',
      lat REAL,
      lng REAL,
      avatar_url TEXT NOT NULL DEFAULT '',
      cover_url TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      producer_id INTEGER NOT NULL REFERENCES producers(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      price REAL NOT NULL,
      unit TEXT NOT NULL DEFAULT 'kg',
      category TEXT NOT NULL DEFAULT 'Altele',
      image_url TEXT NOT NULL DEFAULT '',
      available INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS stores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      county TEXT NOT NULL,
      city TEXT NOT NULL,
      address TEXT NOT NULL DEFAULT '',
      phone TEXT NOT NULL DEFAULT '',
      lat REAL NOT NULL,
      lng REAL NOT NULL
    );
    CREATE TABLE IF NOT EXISTS announcements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      producer_id INTEGER NOT NULL REFERENCES producers(id) ON DELETE CASCADE,
      type TEXT NOT NULL CHECK (type IN ('discount', 'offer', 'free_shipping', 'vacation', 'other')),
      title TEXT NOT NULL,
      message TEXT NOT NULL DEFAULT '',
      percent INTEGER,
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      producer_id INTEGER NOT NULL REFERENCES producers(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
      comment TEXT NOT NULL DEFAULT '',
      reply TEXT NOT NULL DEFAULT '',
      reply_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      producer_id INTEGER REFERENCES producers(id) ON DELETE CASCADE,
      target_user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      type TEXT NOT NULL DEFAULT 'fresh',
      title TEXT NOT NULL,
      message TEXT NOT NULL DEFAULT '',
      read INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      status TEXT NOT NULL DEFAULT 'placed',
      total REAL NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      product_name TEXT NOT NULL,
      producer_id INTEGER NOT NULL REFERENCES producers(id) ON DELETE CASCADE,
      producer_name TEXT NOT NULL,
      price REAL NOT NULL,
      unit TEXT NOT NULL DEFAULT 'kg',
      qty REAL NOT NULL DEFAULT 1,
      image_url TEXT NOT NULL DEFAULT ''
    );
    CREATE TABLE IF NOT EXISTS password_resets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      code TEXT NOT NULL,
      method TEXT NOT NULL DEFAULT 'email',
      expires_at TEXT NOT NULL,
      used INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS site_announcements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      message TEXT NOT NULL DEFAULT '',
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  module.exports = db;

  function ensureColumn(table, column, ddl) {
    const cols = db.prepare(`PRAGMA table_info(${table})`).all().map(c => c.name);
    if (!cols.includes(column)) db.exec(`ALTER TABLE ${table} ADD COLUMN ${ddl}`);
  }
  ensureColumn('users', 'phone', 'phone TEXT');
  db.prepare(`CREATE UNIQUE INDEX IF NOT EXISTS idx_users_phone ON users(phone)`).run();
  ensureColumn('users', 'is_admin', 'is_admin INTEGER NOT NULL DEFAULT 0');
  ensureColumn('users', 'is_mock', 'is_mock INTEGER NOT NULL DEFAULT 0');
  ensureColumn('producers', 'is_mock', 'is_mock INTEGER NOT NULL DEFAULT 0');
  ensureColumn('announcements', 'featured', 'featured INTEGER NOT NULL DEFAULT 0');
}
