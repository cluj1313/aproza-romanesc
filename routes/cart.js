const express = require('express');
const db = require('../db');

const router = express.Router();

function getCart(req) {
  if (!req.session.cart) req.session.cart = {};
  return req.session.cart;
}

function cartSummary(req) {
  const cart = getCart(req);
  const ids = Object.keys(cart).map(Number);
  let items = [];
  let total = 0;
  let count = 0;
  if (ids.length) {
    const placeholders = ids.map(() => '?').join(',');
    const rows = db.prepare(`SELECT p.*, pr.name AS producer_name, pr.id AS producer_id FROM products p JOIN producers pr ON pr.id = p.producer_id WHERE p.id IN (${placeholders})`).all(...ids);
    items = rows.map(row => {
      const qty = cart[row.id];
      count += qty;
      total += qty * row.price;
      return { ...row, qty, lineTotal: (qty * row.price).toFixed(2) };
    });
  }
  return { items, total: total.toFixed(2), count };
}

router.get('/cumparaturi', (req, res) => {
  const summary = cartSummary(req);
  res.render('cart/index', {
    title: 'Cumpărături',
    items: summary.items,
    total: summary.total,
    cartCount: summary.count
  });
});

router.post('/api/cart/add', express.json(), (req, res) => {
  const productId = parseInt(req.body.productId, 10);
  const qty = Math.max(1, parseFloat(req.body.qty) || 1);
  const product = db.prepare('SELECT id FROM products WHERE id = ? AND available = 1').get(productId);
  if (!product) return res.status(404).json({ error: 'Produsul nu mai este disponibil.' });
  const cart = getCart(req);
  cart[productId] = (cart[productId] || 0) + qty;
  res.json({ ok: true, count: cartSummary(req).count });
});

router.post('/api/cart/set', express.json(), (req, res) => {
  const productId = parseInt(req.body.productId, 10);
  const qty = parseFloat(req.body.qty);
  const cart = getCart(req);
  if (qty <= 0) delete cart[productId];
  else cart[productId] = qty;
  const summary = cartSummary(req);
  res.json({ ok: true, count: summary.count, total: summary.total });
});

router.post('/api/cart/clear', (req, res) => {
  req.session.cart = {};
  res.json({ ok: true, count: 0 });
});

// Re-comandă rapidă: readuce în coș produsele de la ultimii cultivatori (ultima comandă)
router.post('/api/cart/reorder', (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Autentifică-te pentru a re-comanda.' });
  }
  const lastOrder = db.prepare(`
    SELECT o.* FROM orders o WHERE o.user_id = ? ORDER BY o.created_at DESC, o.id DESC LIMIT 1
  `).get(req.session.user.id);
  if (!lastOrder) return res.status(400).json({ error: 'Nu ai încă o comandă anterioară.' });

  const items = db.prepare(`
    SELECT oi.* FROM order_items oi WHERE oi.order_id = ? ORDER BY oi.id ASC
  `).all(lastOrder.id);

  const cart = getCart(req);
  let added = 0;
  for (const it of items) {
    const product = db.prepare('SELECT id FROM products WHERE id = ? AND available = 1').get(it.product_id);
    if (!product) continue;
    cart[it.product_id] = (cart[it.product_id] || 0) + it.qty;
    added++;
  }
  if (!added) return res.status(400).json({ error: 'Produsele din ultima comandă nu mai sunt disponibile.' });

  res.json({ ok: true, count: cartSummary(req).count });
});

// Plasează comanda: salvează istoric pentru client + golesc coșul
router.post('/api/cart/order', (req, res) => {
  const summary = cartSummary(req);
  if (!summary.items.length) return res.status(400).json({ error: 'Coșul este gol.' });
  if (!req.session.user) {
    return res.status(401).json({ error: 'Trebuie să fii autentificat pentru a plasa o comandă.' });
  }

  const total = parseFloat(summary.total);
  const insertOrder = db.prepare('INSERT INTO orders (user_id, total) VALUES (?, ?)');
  const orderResult = insertOrder.run(req.session.user.id, total);
  const orderId = orderResult.lastInsertRowid;

  const insertItem = db.prepare(`
    INSERT INTO order_items (order_id, product_id, product_name, producer_id, producer_name, price, unit, qty, image_url)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const txn = db.transaction((items) => {
    for (const it of items) {
      insertItem.run(orderId, it.id, it.name, it.producer_id, it.producer_name, it.price, it.unit, it.qty, it.image_url);
    }
  });
  txn(summary.items);

  req.session.cart = {};
  res.json({ ok: true, orderId, count: 0 });
});

module.exports = router;
module.exports.cartSummary = cartSummary;
