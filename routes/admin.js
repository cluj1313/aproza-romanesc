const express = require('express');
const db = require('../db');
const { requireAdmin } = require('../middleware/auth');
const { cartSummary } = require('./cart');

const router = express.Router();

router.get('/admin/anunturi', requireAdmin, async (req, res) => {
  const announcements = await db.prepare('SELECT * FROM site_announcements ORDER BY created_at DESC').all();
  res.render('admin/site-announcements', {
    title: 'Anunțuri site',
    announcements,
    query: req.query,
    cartCount: (await cartSummary(req)).count
  });
});

router.post('/admin/anunturi', requireAdmin, async (req, res) => {
  const { title, message } = req.body;
  if (!title) return res.redirect('/admin/anunturi?error=1');
  await db.prepare('INSERT INTO site_announcements (title, message) VALUES (?, ?)').run(title, message || '');
  res.redirect('/admin/anunturi?created=1');
});

router.post('/admin/anunturi/:id/delete', requireAdmin, async (req, res) => {
  await db.prepare('DELETE FROM site_announcements WHERE id = ?').run(req.params.id);
  res.redirect('/admin/anunturi?deleted=1');
});

router.post('/admin/anunturi/:id/toggle', requireAdmin, async (req, res) => {
  const ann = await db.prepare('SELECT active FROM site_announcements WHERE id = ?').get(req.params.id);
  if (ann) {
    await db.prepare('UPDATE site_announcements SET active = ? WHERE id = ?').run(ann.active ? 0 : 1, req.params.id);
  }
  res.redirect('/admin/anunturi?toggled=1');
});

router.get('/api/site-announcement', async (req, res) => {
  const ann = await db.prepare('SELECT id, title, message FROM site_announcements WHERE active = 1 ORDER BY created_at DESC LIMIT 1').get();
  res.json(ann || null);
});

router.get('/api/db-status', async (req, res) => {
  const users = await db.prepare('SELECT COUNT(*) AS c FROM users').get();
  const producers = await db.prepare('SELECT COUNT(*) AS c FROM producers').get();
  const products = await db.prepare('SELECT COUNT(*) AS c FROM products').get();
  const mocks = await db.prepare("SELECT COUNT(*) AS c FROM users WHERE is_mock = 1").get();
  const admins = await db.prepare("SELECT COUNT(*) AS c FROM users WHERE is_admin = 1").get();
  res.json({ users: users.c, producers: producers.c, products: products.c, mocks: mocks.c, admins: admins.c });
});

router.post('/admin/reseed', requireAdmin, async (req, res) => {
  const { seedMocks } = require('../seed');
  try {
    await seedMocks();
    res.json({ ok: true, message: 'Mock seed complet.' });
  } catch (err) {
    res.json({ ok: false, error: err.message });
  }
});

module.exports = router;
