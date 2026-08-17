const path = require('path');
const express = require('express');
const session = require('express-session');

const db = require('./db');

async function start() {
  if (db.ready) await db.ready;

  require('./seed');
  const { loadUser, requireAuth } = require('./middleware/auth');
  const authRoutes = require('./routes/auth');
  const catalogRoutes = require('./routes/catalog');
  const producerRoutes = require('./routes/producer');
  const storeRoutes = require('./routes/stores');
  const cartRoutes = require('./routes/cart');
  const notificationRoutes = require('./routes/notifications');
  const adminRoutes = require('./routes/admin');
  const { unreadCount } = require('./routes/notifications');
  const { cartSummary } = require('./routes/cart');

  const app = express();
  const PORT = process.env.PORT || 3000;

  app.set('view engine', 'ejs');
  app.set('views', path.join(__dirname, 'views'));

  app.use(express.urlencoded({ extended: true }));
  app.use(express.json());
  app.use(express.static(path.join(__dirname, 'public')));

  if (process.env.DATABASE_URL) {
    const PgSession = require('connect-pg-simple')(session);
    app.use(session({
      store: new PgSession({ pool: db.pool, tableName: 'user_sessions' }),
      secret: process.env.SESSION_SECRET || 'schimba_aceasta_cheie_in_productie',
      resave: false,
      saveUninitialized: false,
      cookie: { httpOnly: true, maxAge: 1000 * 60 * 60 * 24 * 7 }
    }));
  } else {
    app.use(session({
      secret: process.env.SESSION_SECRET || 'schimba_aceasta_cheie_in_productie',
      resave: false,
      saveUninitialized: false,
      cookie: { httpOnly: true, maxAge: 1000 * 60 * 60 * 24 * 7 }
    }));
  }

  app.use(loadUser);

  function parseCookies(header) {
    const out = {};
    String(header || '').split(';').forEach(part => {
      const idx = part.indexOf('=');
      if (idx > -1) out[part.slice(0, idx).trim()] = decodeURIComponent(part.slice(idx + 1).trim());
    });
    return out;
  }

  app.use((req, res, next) => {
    if (!req.session.location) {
      const raw = parseCookies(req.headers.cookie).aprozar_loc;
      if (raw) {
        const [lat, lng] = raw.split(',').map(parseFloat);
        if (!isNaN(lat) && !isNaN(lng)) req.session.location = { lat, lng };
      }
    }
    next();
  });

  app.use(async (req, res, next) => {
    try {
      res.locals.cartCount = await cartSummary(req);
    } catch (e) {
      res.locals.cartCount = { items: [], total: '0.00', count: 0 };
    }
    try {
      res.locals.unreadNotifs = req.session.user ? await unreadCount(req.session.user.id) : 0;
    } catch (e) {
      res.locals.unreadNotifs = 0;
    }
    next();
  });

  app.use(authRoutes);
  app.use('/', catalogRoutes);
  app.use(storeRoutes);
  app.use(cartRoutes);
  app.use(notificationRoutes);
  app.use(producerRoutes);
  app.use(adminRoutes);

  app.get('/contul-meu', requireAuth, async (req, res) => {
    const isProducer = req.session.user.role === 'producer';
    const cc = await cartSummary(req);
    res.render('account/index', {
      title: 'Contul meu',
      isProducer,
      cartCount: cc.count
    });
  });

  app.use((req, res) => {
    res.status(404).render('misc/notfound', {
      title: 'Pagina nu există',
      cartCount: res.locals.cartCount ? res.locals.cartCount.count : 0
    });
  });

  app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).render('misc/error', {
      title: 'Eroare',
      message: err.message || 'A apărut o eroare.',
      cartCount: res.locals.cartCount ? res.locals.cartCount.count : 0
    });
  });

  app.listen(PORT, () => {
    console.log(`✅ Aprozar Românesc rulează: http://localhost:${PORT}`);
  });
}

start().catch(err => {
  console.error('Eroare la pornire:', err);
  process.exit(1);
});
