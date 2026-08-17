const express = require('express');
const db = require('../db');
const { CATEGORIES } = require('../lib/constants');
const { withDistance, formatDistance } = require('../lib/geo');
const { cartSummary } = require('./cart');

const router = express.Router();

async function avgRating(producerId) {
  const row = await db.prepare(
    'SELECT ROUND(AVG(rating), 1) AS avg, COUNT(*) AS count FROM reviews WHERE producer_id = ?'
  ).get(producerId);
  return { avg: row ? row.avg || 0 : 0, count: row ? row.count : 0 };
}

async function activeAnnouncement(producerId) {
  return await db.prepare(
    'SELECT * FROM announcements WHERE producer_id = ? AND active = 1 ORDER BY featured DESC, created_at DESC LIMIT 1'
  ).get(producerId) || null;
}

async function decorateProducer(rows) {
  const results = [];
  for (const p of rows) {
    const r = await avgRating(p.id);
    const ann = await activeAnnouncement(p.id);
    const anns = await db.prepare(
      'SELECT * FROM announcements WHERE producer_id = ? AND active = 1 ORDER BY created_at DESC'
    ).all(p.id);
    const products = await db.prepare(
      'SELECT id, name, price, unit, image_url FROM products WHERE producer_id = ? AND available = 1 ORDER BY created_at DESC LIMIT 3'
    ).all(p.id);
    const reviews = await db.prepare(`
      SELECT r.id, r.rating, r.comment, r.reply, r.reply_at, u.name AS user_name
      FROM reviews r JOIN users u ON u.id = r.user_id
      WHERE r.producer_id = ? ORDER BY r.created_at DESC LIMIT 2
    `).all(p.id);
    results.push({ ...p, rating: r.avg, ratingCount: r.count, announcement: ann, announcements: anns, products, reviews });
  }
  return results;
}

async function productCards(limit) {
  return await db.prepare(`
    SELECT pr.id, pr.name, pr.price, pr.unit, pr.image_url, pr.category,
           p.id AS producer_id, p.name AS producer_name, p.county, p.locality,
           p.owner_name
    FROM products pr
    JOIN producers p ON p.id = pr.producer_id
    WHERE pr.available = 1
    ORDER BY pr.created_at DESC
    LIMIT ?
  `).all(limit);
}

router.get('/', async (req, res) => {
  const { q, category } = req.query;
  const loc = req.session.location || {};
  const base = await cartSummary(req);
  const activeCategory = category || (q ? null : null);

  let producers = [];
  let searchProducts = [];
  if (activeCategory) {
    producers = await db.prepare(`
      SELECT DISTINCT p.* FROM producers p
      JOIN products pr ON pr.producer_id = p.id
      WHERE pr.available = 1 AND pr.category = ?
      ORDER BY p.name
    `).all(activeCategory);
    searchProducts = await db.prepare(`
      SELECT pr.id, pr.name, pr.price, pr.unit, pr.image_url, pr.category,
             p.id AS producer_id, p.name AS producer_name, p.county, p.locality, p.owner_name
      FROM products pr JOIN producers p ON p.id = pr.producer_id
      WHERE pr.available = 1 AND pr.category = ?
      ORDER BY pr.name
    `).all(activeCategory);
  } else if (q) {
    const like = `%${String(q).trim()}%`;
    producers = await db.prepare(`
      SELECT p.* FROM producers p
      WHERE unaccent(p.name) LIKE unaccent(?) OR unaccent(p.locality) LIKE unaccent(?) OR unaccent(p.description) LIKE unaccent(?) OR unaccent(p.owner_name) LIKE unaccent(?)
      ORDER BY p.name
    `).all(like, like, like, like);
    searchProducts = await db.prepare(`
      SELECT pr.id, pr.name, pr.price, pr.unit, pr.image_url, pr.category,
             p.id AS producer_id, p.name AS producer_name, p.county, p.locality, p.owner_name
      FROM products pr JOIN producers p ON p.id = pr.producer_id
      WHERE pr.available = 1 AND (unaccent(pr.name) LIKE unaccent(?) OR unaccent(pr.description) LIKE unaccent(?))
      ORDER BY pr.name
    `).all(like, like);
  } else {
    producers = await db.prepare('SELECT * FROM producers ORDER BY created_at ASC').all();
  }

  producers = withDistance(producers, loc.lat, loc.lng);
  producers = await decorateProducer(producers);

  const productOfWeek = await db.prepare(`
    SELECT pr.*, p.id AS producer_id, p.name AS producer_name, p.county, p.locality, p.owner_name
    FROM products pr JOIN producers p ON p.id = pr.producer_id
    WHERE pr.available = 1 ORDER BY RANDOM() LIMIT 1
  `).get();

  const featured = await productCards(12);
  let farmers = await decorateProducer(
    withDistance(
      await db.prepare('SELECT * FROM producers ORDER BY created_at ASC LIMIT 8').all(),
      loc.lat, loc.lng
    )
  );
  farmers.sort((a, b) =>
    (b.rating - a.rating) ||
    (b.ratingCount - a.ratingCount) ||
    a.name.localeCompare(b.name)
  );

  const weekBasket = await db.prepare(`
    SELECT pr.*, p.name AS producer_name FROM products pr
    JOIN producers p ON p.id = pr.producer_id
    WHERE pr.available = 1 AND pr.category IN ('Legume', 'Fructe')
    ORDER BY RANDOM() LIMIT 6
  `).all();

  let lastOrder = null;
  if (req.session.user) {
    lastOrder = await db.prepare(`
      SELECT o.* FROM orders o WHERE o.user_id = ? ORDER BY o.created_at DESC, o.id DESC LIMIT 1
    `).get(req.session.user.id);
    if (lastOrder) {
      lastOrder.items = await db.prepare(`
        SELECT oi.* FROM order_items oi WHERE oi.order_id = ? ORDER BY oi.id ASC
      `).all(lastOrder.id);
      const producerIds = [...new Set(lastOrder.items.map(i => i.producer_id))];
      if (producerIds.length) {
        const placeholders = producerIds.map((_, i) => `$${i + 1}`).join(',');
        lastOrder.producers = await db.prepare(
          `SELECT * FROM producers WHERE id IN (${placeholders})`
        ).all(...producerIds);
      }
    }
  }

  res.render('home/index', {
    title: 'Acasă',
    user: req.session.user || null,
    producers,
    productOfWeek,
    featured,
    farmers,
    weekBasket,
    lastOrder,
    isProducer: req.session.user && req.session.user.role === 'producer',
    producerUserId: req.session.user ? req.session.user.id : null,
    categories: CATEGORIES,
    filters: { q: q || '', category: activeCategory || '' },
    searchProducts,
    cartCount: base.count,
    hasLocation: loc.lat != null && loc.lng != null
  });
});

router.get('/categorii', async (req, res) => {
  const perCategory = [];
  for (const c of CATEGORIES) {
    const row = await db.prepare('SELECT COUNT(*) AS c FROM products WHERE available = 1 AND category = ?').get(c.name);
    perCategory.push({ ...c, count: row ? row.c : 0 });
  }

  res.render('home/categories', {
    title: 'Categorii',
    categories: perCategory,
    cartCount: res.locals.cartCount.count
  });
});

router.get('/cauta', async (req, res) => {
  const { q } = req.query;
  const loc = req.session.location || {};
  const like = q ? `%${String(q).trim()}%` : '%';

  let results = {
    producers: [],
    products: []
  };

  if (q) {
    results.producers = withDistance(await db.prepare(`
      SELECT p.* FROM producers p
      WHERE unaccent(p.name) LIKE unaccent(?) OR unaccent(p.locality) LIKE unaccent(?) OR unaccent(p.description) LIKE unaccent(?) OR unaccent(p.owner_name) LIKE unaccent(?)
    `).all(like, like, like, like), loc.lat, loc.lng);
    results.producers = await decorateProducer(results.producers);
    results.products = await db.prepare(`
      SELECT pr.*, p.id AS producer_id, p.name AS producer_name, p.county
      FROM products pr JOIN producers p ON p.id = pr.producer_id
      WHERE pr.available = 1 AND (unaccent(pr.name) LIKE unaccent(?) OR unaccent(pr.description) LIKE unaccent(?))
    `).all(like, like);
  }

  res.render('home/search', {
    title: 'Căutare',
    query: q || '',
    results,
    cartCount: res.locals.cartCount.count
  });
});

router.get('/producator/:id', async (req, res) => {
  const producer = await db.prepare(`
    SELECT p.*, u.email FROM producers p
    JOIN users u ON u.id = p.user_id WHERE p.id = ?
  `).get(req.params.id);

  if (!producer) return res.status(404).render('misc/notfound', { title: 'Nu am găsit producătorul', cartCount: res.locals.cartCount.count });

  const loc = req.session.location || {};
  const [withDist] = withDistance([producer], loc.lat, loc.lng);

  const products = await db.prepare(`
    SELECT * FROM products WHERE producer_id = ? AND available = 1 ORDER BY category, name
  `).all(producer.id);

  const grouped = products.reduce((acc, pr) => {
    (acc[pr.category] = acc[pr.category] || []).push(pr);
    return acc;
  }, {});

  const announcements = await db.prepare(`
    SELECT * FROM announcements WHERE producer_id = ? AND active = 1 ORDER BY created_at DESC
  `).all(producer.id);

  const rating = await avgRating(producer.id);
  const reviews = await db.prepare(`
    SELECT r.*, u.name AS user_name, u.id AS user_id FROM reviews r
    JOIN users u ON u.id = r.user_id
    WHERE r.producer_id = ? ORDER BY r.created_at DESC
  `).all(producer.id);

  const myReview = req.session.user ? reviews.find(r => r.user_id === req.session.user.id) : null;

  res.render('catalog/producer', {
    title: producer.name,
    producer: withDist,
    products,
    grouped,
    categories: Object.keys(grouped),
    announcements,
    rating,
    reviews,
    myReview,
    canReview: req.session.user && req.session.user.role === 'customer' && !myReview,
    cartCount: res.locals.cartCount.count,
    formatDistance
  });
});

router.post('/producator/:id/review', express.urlencoded({ extended: true }), async (req, res) => {
  const producerId = parseInt(req.params.id, 10);
  if (!req.session.user || req.session.user.role !== 'customer') {
    return res.status(401).redirect('/login?next=' + encodeURIComponent('/producator/' + producerId));
  }
  const rating = parseInt(req.body.rating, 10);
  if (!rating || rating < 1 || rating > 5) return res.redirect('/producator/' + producerId);
  const comment = String(req.body.comment || '').trim();
  if (!comment) return res.redirect('/producator/' + producerId);

  const exists = await db.prepare('SELECT id FROM reviews WHERE producer_id = ? AND user_id = ?').get(producerId, req.session.user.id);
  if (exists) return res.redirect('/producator/' + producerId);

  await db.prepare('INSERT INTO reviews (producer_id, user_id, rating, comment) VALUES (?, ?, ?, ?)')
    .run(producerId, req.session.user.id, rating, comment);

  res.redirect('/producator/' + producerId + '#recenzii');
});

module.exports = router;
