const express = require('express');
const db = require('../db');
const { CATEGORIES } = require('../lib/constants');
const { withDistance, formatDistance } = require('../lib/geo');
const { cartSummary } = require('./cart');

const router = express.Router();

function avgRating(producerId) {
  const row = db.prepare(
    'SELECT ROUND(AVG(rating), 1) AS avg, COUNT(*) AS count FROM reviews WHERE producer_id = ?'
  ).get(producerId);
  return { avg: row.avg || 0, count: row.count };
}

function activeAnnouncement(producerId) {
  return db.prepare(
    'SELECT * FROM announcements WHERE producer_id = ? AND active = 1 ORDER BY featured DESC, created_at DESC LIMIT 1'
  ).get(producerId) || null;
}

function decorateProducer(rows) {
  const productStmt = db.prepare(
    'SELECT id, name, price, unit, image_url FROM products WHERE producer_id = ? AND available = 1 ORDER BY created_at DESC LIMIT 3'
  );
  const reviewsStmt = db.prepare(`
    SELECT r.id, r.rating, r.comment, r.reply, r.reply_at, u.name AS user_name
    FROM reviews r JOIN users u ON u.id = r.user_id
    WHERE r.producer_id = ? ORDER BY r.created_at DESC LIMIT 2
  `);
  return rows.map(p => {
    const r = avgRating(p.id);
    const ann = activeAnnouncement(p.id);
    const anns = db.prepare(
      'SELECT * FROM announcements WHERE producer_id = ? AND active = 1 ORDER BY created_at DESC'
    ).all(p.id);
    return { ...p, rating: r.avg, ratingCount: r.count, announcement: ann, announcements: anns, products: productStmt.all(p.id), reviews: reviewsStmt.all(p.id) };
  });
}

function productCards(limit) {
  return db.prepare(`
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

router.get('/', (req, res) => {
  const { q, category } = req.query;
  const loc = req.session.location || {};
  const base = cartSummary(req);
  const activeCategory = category || (q ? null : null);

  let producers = [];
  let searchProducts = [];
  if (activeCategory) {
    producers = db.prepare(`
      SELECT DISTINCT p.* FROM producers p
      JOIN products pr ON pr.producer_id = p.id
      WHERE pr.available = 1 AND pr.category = ?
      ORDER BY p.name COLLATE NOCASE
    `).all(activeCategory);
    searchProducts = db.prepare(`
      SELECT pr.id, pr.name, pr.price, pr.unit, pr.image_url, pr.category,
             p.id AS producer_id, p.name AS producer_name, p.county, p.locality, p.owner_name
      FROM products pr JOIN producers p ON p.id = pr.producer_id
      WHERE pr.available = 1 AND pr.category = ?
      ORDER BY pr.name COLLATE NOCASE
    `).all(activeCategory);
  } else if (q) {
    const like = `%${String(q).trim()}%`;
    producers = db.prepare(`
      SELECT p.* FROM producers p
      WHERE unaccent(p.name) LIKE unaccent(?) OR unaccent(p.locality) LIKE unaccent(?) OR unaccent(p.description) LIKE unaccent(?) OR unaccent(p.owner_name) LIKE unaccent(?)
      ORDER BY p.name COLLATE NOCASE
    `).all(like, like, like, like);
    searchProducts = db.prepare(`
      SELECT pr.id, pr.name, pr.price, pr.unit, pr.image_url, pr.category,
             p.id AS producer_id, p.name AS producer_name, p.county, p.locality, p.owner_name
      FROM products pr JOIN producers p ON p.id = pr.producer_id
      WHERE pr.available = 1 AND (unaccent(pr.name) LIKE unaccent(?) OR unaccent(pr.description) LIKE unaccent(?))
      ORDER BY pr.name COLLATE NOCASE
    `).all(like, like);
  } else {
    producers = db.prepare('SELECT * FROM producers ORDER BY created_at ASC').all();
  }

  producers = withDistance(producers, loc.lat, loc.lng);
  producers = decorateProducer(producers);

  const productOfWeek = db.prepare(`
    SELECT pr.*, p.id AS producer_id, p.name AS producer_name, p.county, p.locality, p.owner_name
    FROM products pr JOIN producers p ON p.id = pr.producer_id
    WHERE pr.available = 1 ORDER BY RANDOM() LIMIT 1
  `).get();

  const featured = productCards(12);
  let farmers = decorateProducer(
    withDistance(
      db.prepare('SELECT * FROM producers ORDER BY created_at ASC LIMIT 8').all(),
      loc.lat, loc.lng
    )
  );
  farmers.sort((a, b) =>
    (b.rating - a.rating) ||
    (b.ratingCount - a.ratingCount) ||
    a.name.localeCompare(b.name)
  );

  const weekBasket = db.prepare(`
    SELECT pr.*, p.name AS producer_name FROM products pr
    JOIN producers p ON p.id = pr.producer_id
    WHERE pr.available = 1 AND pr.category IN ('Legume', 'Fructe')
    ORDER BY RANDOM() LIMIT 6
  `).all();

  // Ultimele cumpărături: ultima comandă a clientului, cu producătorii și produsele
  let lastOrder = null;
  if (req.session.user) {
    lastOrder = db.prepare(`
      SELECT o.* FROM orders o WHERE o.user_id = ? ORDER BY o.created_at DESC, o.id DESC LIMIT 1
    `).get(req.session.user.id);
    if (lastOrder) {
      lastOrder.items = db.prepare(`
        SELECT oi.* FROM order_items oi WHERE oi.order_id = ? ORDER BY oi.id ASC
      `).all(lastOrder.id);
      const producerIds = [...new Set(lastOrder.items.map(i => i.producer_id))];
      lastOrder.producers = db.prepare(
        `SELECT * FROM producers WHERE id IN (${producerIds.map(() => '?').join(',')})`
      ).all(...producerIds);
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

router.get('/categorii', (req, res) => {
  const perCategory = CATEGORIES.map(c => {
    const count = db.prepare('SELECT COUNT(*) AS c FROM products WHERE available = 1 AND category = ?').get(c.name).c;
    return { ...c, count };
  });

  res.render('home/categories', {
    title: 'Categorii',
    categories: perCategory,
    cartCount: cartSummary(req).count
  });
});

router.get('/cauta', (req, res) => {
  const { q } = req.query;
  const loc = req.session.location || {};
  const like = q ? `%${String(q).trim()}%` : '%';

  let results = {
    producers: [],
    products: []
  };

  if (q) {
    results.producers = withDistance(db.prepare(`
      SELECT p.* FROM producers p
      WHERE unaccent(p.name) LIKE unaccent(?) OR unaccent(p.locality) LIKE unaccent(?) OR unaccent(p.description) LIKE unaccent(?) OR unaccent(p.owner_name) LIKE unaccent(?)
    `).all(like, like, like, like), loc.lat, loc.lng);
    results.producers = decorateProducer(results.producers);
    results.products = db.prepare(`
      SELECT pr.*, p.id AS producer_id, p.name AS producer_name, p.county
      FROM products pr JOIN producers p ON p.id = pr.producer_id
      WHERE pr.available = 1 AND (unaccent(pr.name) LIKE unaccent(?) OR unaccent(pr.description) LIKE unaccent(?))
    `).all(like, like);
  }

  res.render('home/search', {
    title: 'Căutare',
    query: q || '',
    results,
    cartCount: cartSummary(req).count
  });
});

router.get('/producator/:id', (req, res) => {
  const producer = db.prepare(`
    SELECT p.*, u.email FROM producers p
    JOIN users u ON u.id = p.user_id WHERE p.id = ?
  `).get(req.params.id);

  if (!producer) return res.status(404).render('misc/notfound', { title: 'Nu am găsit producătorul', cartCount: cartSummary(req).count });

  const loc = req.session.location || {};
  const [withDist] = withDistance([producer], loc.lat, loc.lng);

  const products = db.prepare(`
    SELECT * FROM products WHERE producer_id = ? AND available = 1 ORDER BY category, name COLLATE NOCASE
  `).all(producer.id);

  const grouped = products.reduce((acc, pr) => {
    (acc[pr.category] = acc[pr.category] || []).push(pr);
    return acc;
  }, {});

  const announcements = db.prepare(`
    SELECT * FROM announcements WHERE producer_id = ? AND active = 1 ORDER BY created_at DESC
  `).all(producer.id);

  const rating = avgRating(producer.id);
  const reviews = db.prepare(`
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
    cartCount: cartSummary(req).count,
    formatDistance
  });
});

router.post('/producator/:id/review', express.urlencoded({ extended: true }), (req, res) => {
  const producerId = parseInt(req.params.id, 10);
  if (!req.session.user || req.session.user.role !== 'customer') {
    return res.status(401).redirect('/login?next=' + encodeURIComponent('/producator/' + producerId));
  }
  const rating = parseInt(req.body.rating, 10);
  if (!rating || rating < 1 || rating > 5) return res.redirect('/producator/' + producerId);
  const comment = String(req.body.comment || '').trim();
  if (!comment) return res.redirect('/producator/' + producerId);

  const exists = db.prepare('SELECT id FROM reviews WHERE producer_id = ? AND user_id = ?').get(producerId, req.session.user.id);
  if (exists) return res.redirect('/producator/' + producerId);

  db.prepare('INSERT INTO reviews (producer_id, user_id, rating, comment) VALUES (?, ?, ?, ?)')
    .run(producerId, req.session.user.id, rating, comment);

  res.redirect('/producator/' + producerId + '#recenzii');
});

module.exports = router;
