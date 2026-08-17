const express = require('express');
const db = require('../db');
const { CATEGORIES, CATEGORY_NAMES, ANNOUNCEMENT_TYPES, COUNTIES } = require('../lib/constants');
const { requireRole } = require('../middleware/auth');
const { single, fields } = require('../middleware/upload');
const { cartSummary } = require('./cart');

const router = express.Router();
const producerOnly = requireRole('producer');

async function getProducerFor(userId) {
  return await db.prepare('SELECT * FROM producers WHERE user_id = ?').get(userId);
}

async function broadcastToCustomers(producerId, type, title, message) {
  const customers = await db.prepare("SELECT id FROM users WHERE role = 'customer'").all();
  for (const c of customers) {
    await db.prepare(
      'INSERT INTO notifications (producer_id, target_user_id, type, title, message) VALUES (?, ?, ?, ?, ?)'
    ).run(producerId, c.id, type, title, message);
  }
  return customers.length;
}

router.get('/dashboard', producerOnly, async (req, res) => {
  const producer = await getProducerFor(req.session.user.id);
  if (!producer) return res.status(404).send('Profil de producător lipsă.');

  const products = await db.prepare('SELECT * FROM products WHERE producer_id = ? ORDER BY created_at DESC').all(producer.id);
  const announcements = await db.prepare('SELECT * FROM announcements WHERE producer_id = ? ORDER BY created_at DESC').all(producer.id);
  const pendingReviews = await db.prepare(`
    SELECT r.*, u.name AS user_name FROM reviews r
    JOIN users u ON u.id = r.user_id
    WHERE r.producer_id = ? ORDER BY r.created_at DESC LIMIT 10
  `).all(producer.id);

  const availableCount = products.filter(p => p.available).length;
  const avg = await db.prepare('SELECT ROUND(AVG(rating),1) AS avg, COUNT(*) AS c FROM reviews WHERE producer_id = ?').get(producer.id);

  res.render('dashboard/index', {
    title: 'Dashboard',
    producer,
    products,
    announcements,
    pendingReviews,
    query: req.query,
    stats: { total: products.length, availableCount, avg: avg ? avg.avg || 0 : 0, reviews: avg ? avg.c : 0 },
    cartCount: res.locals.cartCount.count
  });
});

router.get('/profil', producerOnly, async (req, res) => {
  res.render('dashboard/profile', {
    title: 'Profilul meu',
    producer: await getProducerFor(req.session.user.id),
    counties: COUNTIES,
    error: null, success: null, uploadError: null,
    cartCount: res.locals.cartCount.count
  });
});

router.post('/profil', producerOnly, fields([{ name: 'image', maxCount: 1 }, { name: 'cover_file', maxCount: 1 }]), async (req, res) => {
  const producer = await getProducerFor(req.session.user.id);
  const { name, owner_name, description, county, locality, address, phone, whatsapp, lat, lng } = req.body;

  const fail = (error) => res.status(400).render('dashboard/profile', {
    title: 'Profilul meu', producer, counties: COUNTIES, error, success: null, uploadError: req.uploadError || null, cartCount: res.locals.cartCount.count
  });

  if (!name || !county) return fail('Numele fermei și județul sunt obligatorii.');

  let avatar = producer.avatar_url;
  let cover = producer.cover_url;
  if (req.files) {
    if (req.files.image) avatar = '/uploads/' + req.files.image[0].filename;
    if (req.files.cover_file) cover = '/uploads/' + req.files.cover_file[0].filename;
  }

  await db.prepare(`
    UPDATE producers
    SET name = ?, owner_name = ?, description = ?, county = ?, locality = ?, address = ?,
        phone = ?, whatsapp = ?, lat = ?, lng = ?, avatar_url = ?, cover_url = ?
    WHERE id = ?
  `).run(
    String(name).trim(),
    String(owner_name || '').trim(),
    String(description || '').trim(),
    String(county),
    String(locality || '').trim(),
    String(address || '').trim(),
    String(phone || '').trim(),
    String(whatsapp || phone || '').trim(),
    parseFloat(lat) || null,
    parseFloat(lng) || null,
    avatar,
    cover,
    producer.id
  );

  req.session.user.name = String(name).trim();

  res.render('dashboard/profile', {
    title: 'Profilul meu',
    producer: await getProducerFor(req.session.user.id),
    counties: COUNTIES,
    error: null,
    success: 'Profilul a fost actualizat cu succes.',
    uploadError: null,
    cartCount: res.locals.cartCount.count
  });
});

router.get('/produs/nou', producerOnly, async (req, res) => {
  res.render('dashboard/product-form', {
    title: 'Produs nou', producer: await getProducerFor(req.session.user.id),
    categories: CATEGORY_NAMES, product: null, error: null, uploadError: req.uploadError,
    cartCount: res.locals.cartCount.count
  });
});

router.post('/produs/nou', producerOnly, single('image'), async (req, res) => {
  const producer = await getProducerFor(req.session.user.id);
  const { name, description, price, unit, category, available } = req.body;
  const imageUrl = req.file ? '/uploads/' + req.file.filename : '';

  const isJson = req.get('Accept') && req.get('Accept').includes('application/json');

  const fail = (error) => {
    if (isJson) return res.status(400).json({ ok: false, error });
    return res.status(400).render('dashboard/product-form', {
      title: 'Produs nou', producer,
      categories: CATEGORY_NAMES,
      product: { name, description, price, unit, category, image_url: imageUrl },
      error, uploadError: req.uploadError, cartCount: res.locals.cartCount.count
    });
  };

  const numericPrice = parseFloat(price);
  if (!name) return fail('Numele produsului este obligatoriu.');
  if (isNaN(numericPrice) || numericPrice < 0) return fail('Prețul introdus nu este valid.');
  if (!CATEGORY_NAMES.includes(category)) return fail('Categoria selectată nu este validă.');

  const result = await db.prepare(`
    INSERT INTO products (producer_id, name, description, price, unit, category, image_url, available)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(producer.id, String(name).trim(), String(description || '').trim(), numericPrice,
    String(unit || 'kg').trim(), String(category), imageUrl, available === undefined || available ? 1 : 0);

  if (isJson) return res.json({ ok: true, id: result.lastInsertRowid, name: String(name).trim() });
  res.redirect('/dashboard');
});

router.post('/poveste', producerOnly, async (req, res) => {
  const producer = await getProducerFor(req.session.user.id);
  if (!producer) return res.status(404).json({ ok: false, error: 'Profil de producător lipsă.' });
  const story = String(req.body.story || '').trim();
  if (!story) return res.status(400).json({ ok: false, error: 'Povestea nu poate fi goală.' });
  await db.prepare('UPDATE producers SET description = ? WHERE id = ?').run(story.slice(0, 600), producer.id);
  res.json({ ok: true, story: story.slice(0, 600) });
});

router.get('/produs/:id/editeaza', producerOnly, async (req, res) => {
  const producer = await getProducerFor(req.session.user.id);
  const product = await db.prepare('SELECT * FROM products WHERE id = ? AND producer_id = ?').get(req.params.id, producer.id);
  if (!product) return res.status(404).send('Produsul nu există.');

  res.render('dashboard/product-form', {
    title: 'Editează produsul', producer,
    categories: CATEGORY_NAMES, product, error: null, uploadError: req.uploadError,
    cartCount: res.locals.cartCount.count
  });
});

router.post('/produs/:id/editeaza', producerOnly, single('image'), async (req, res) => {
  const producer = await getProducerFor(req.session.user.id);
  const product = await db.prepare('SELECT * FROM products WHERE id = ? AND producer_id = ?').get(req.params.id, producer.id);
  if (!product) return res.status(404).send('Produsul nu există.');

  const { name, description, price, unit, category, available } = req.body;
  const imageUrl = req.file ? '/uploads/' + req.file.filename : product.image_url;
  const numericPrice = parseFloat(price);

  const fail = (error) => res.status(400).render('dashboard/product-form', {
    title: 'Editează produsul', producer,
    categories: CATEGORY_NAMES,
    product: { ...product, name, description, price, unit, category, image_url: imageUrl, available },
    error, uploadError: req.uploadError, cartCount: res.locals.cartCount.count
  });

  if (!name) return fail('Numele produsului este obligatoriu.');
  if (isNaN(numericPrice) || numericPrice < 0) return fail('Prețul introdus nu este valid.');
  if (!CATEGORY_NAMES.includes(category)) return fail('Categoria selectată nu este validă.');

  await db.prepare(`
    UPDATE products SET name = ?, description = ?, price = ?, unit = ?, category = ?, image_url = ?, available = ?
    WHERE id = ?
  `).run(String(name).trim(), String(description || '').trim(), numericPrice,
    String(unit || 'kg').trim(), String(category), imageUrl, available ? 1 : 0, product.id);

  res.redirect('/dashboard');
});

router.post('/produs/:id/sterge', producerOnly, async (req, res) => {
  const producer = await getProducerFor(req.session.user.id);
  await db.prepare('DELETE FROM products WHERE id = ? AND producer_id = ?').run(req.params.id, producer.id);
  res.redirect('/dashboard');
});

router.get('/notificare-noua', producerOnly, async (req, res) => {
  const producer = await getProducerFor(req.session.user.id);
  const myProducts = await db.prepare('SELECT id, name, price, unit FROM products WHERE producer_id = ? AND available = 1 ORDER BY created_at DESC').all(producer.id);
  res.render('dashboard/notify-form', {
    title: 'Notificare recoltare proaspătă',
    producer, myProducts, error: null,
    cartCount: res.locals.cartCount.count
  });
});

router.post('/notificare-noua', producerOnly, async (req, res) => {
  const producer = await getProducerFor(req.session.user.id);
  const { title, message, product_id } = req.body;

  let msg = String(message || '').trim();
  let t = String(title || '').trim();
  const pid = parseInt(product_id, 10);

  if (pid) {
    const pr = await db.prepare('SELECT name, price, unit FROM products WHERE id = ? AND producer_id = ?').get(pid, producer.id);
    if (pr) {
      t = t || `🌱 Recoltă proaspătă: ${pr.name}`;
      msg = msg || `${pr.name} — ${pr.price.toFixed(2).replace('.', ',')} lei / ${pr.unit}. Disponibil la ${producer.name}!`;
    }
  }

  if (!t || !msg) {
    const myProducts = await db.prepare('SELECT id, name, price, unit FROM products WHERE producer_id = ? AND available = 1').all(producer.id);
    return res.status(400).render('dashboard/notify-form', {
      title: 'Notificare recoltare proaspătă',
      producer, myProducts,
      error: 'Completează titlul și mesajul notificării.',
      cartCount: res.locals.cartCount.count
    });
  }

  const count = await broadcastToCustomers(producer.id, 'fresh', t, msg);
  res.redirect('/dashboard?trimis=' + count);
});

router.get('/anunt/nou', producerOnly, async (req, res) => {
  res.render('dashboard/announcement-form', {
    title: 'Anunț nou', producer: await getProducerFor(req.session.user.id),
    types: ANNOUNCEMENT_TYPES, announcement: null, error: null,
    cartCount: res.locals.cartCount.count
  });
});

router.post('/anunt/nou', producerOnly, async (req, res) => {
  const producer = await getProducerFor(req.session.user.id);
  const { type, title, message, percent } = req.body;
  const featured = req.body.featured ? 1 : 0;
  const types = ANNOUNCEMENT_TYPES.map(t => t.id);

  const fail = (error) => res.status(400).render('dashboard/announcement-form', {
    title: 'Anunț nou', producer, types,
    announcement: { type, title, message, percent, featured }, error,
    cartCount: res.locals.cartCount.count
  });

  if (!types.includes(type)) return fail('Tip de anunț invalid.');
  if (!title) return fail('Titlul anunțului este obligatoriu.');

  if (featured) {
    await db.prepare('UPDATE announcements SET featured = 0 WHERE producer_id = ?').run(producer.id);
  }

  const annResult = await db.prepare(
    'INSERT INTO announcements (producer_id, type, title, message, percent, featured) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(producer.id, type, String(title).trim(), String(message || '').trim(), parseInt(percent, 10) || null, featured);

  const typeLabel = ANNOUNCEMENT_TYPES.find(t => t.id === type);
  await broadcastToCustomers(producer.id, 'announcement', `${typeLabel.icon} ${title} — ${producer.name}`, message || title);

  res.redirect('/dashboard');
});

router.post('/anunt/:id/featured', producerOnly, async (req, res) => {
  const producer = await getProducerFor(req.session.user.id);
  const target = await db.prepare('SELECT id FROM announcements WHERE id = ? AND producer_id = ?').get(req.params.id, producer.id);
  if (target) {
    await db.prepare('UPDATE announcements SET featured = 0 WHERE producer_id = ?').run(producer.id);
    await db.prepare('UPDATE announcements SET featured = 1 WHERE id = ?').run(target.id);
  }
  res.redirect('/dashboard');
});

router.post('/anunt/:id/dezactiveaza', producerOnly, async (req, res) => {
  const producer = await getProducerFor(req.session.user.id);
  await db.prepare('UPDATE announcements SET active = 0 WHERE id = ? AND producer_id = ?').run(req.params.id, producer.id);
  res.redirect('/dashboard');
});

router.post('/anunt/:id/sterge', producerOnly, async (req, res) => {
  const producer = await getProducerFor(req.session.user.id);
  await db.prepare('DELETE FROM announcements WHERE id = ? AND producer_id = ?').run(req.params.id, producer.id);
  res.redirect('/dashboard');
});

router.post('/review/:id/raspunde', producerOnly, async (req, res) => {
  const producer = await getProducerFor(req.session.user.id);
  const reply = String(req.body.reply || '').trim();
  await db.prepare(`UPDATE reviews SET reply = ?, reply_at = NOW() WHERE id = ? AND producer_id = ?`)
    .run(reply, req.params.id, producer.id);
  const referer = req.get('Referer');
  if (referer && referer.startsWith(req.protocol + '://' + req.get('host'))) {
    return res.redirect(referer);
  }
  res.redirect('/dashboard#recenzii');
});

module.exports = router;
