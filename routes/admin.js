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
  const tables = await db.prepare("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name").all();
  const cols = await db.prepare("SELECT column_name FROM information_schema.columns WHERE table_name = 'users' ORDER BY ordinal_position").all();
  res.json({
    users: users.c, producers: producers.c, products: products.c, mocks: mocks.c, admins: admins.c,
    tables: tables.map(t => t.table_name),
    userCols: cols.map(c => c.column_name)
  });
});

router.get('/admin/moderatie', requireAdmin, async (req, res) => {
  const users = await db.prepare(`
    SELECT u.id, u.name, u.phone, u.role, u.is_admin, u.is_mock, u.is_banned,
           (SELECT COUNT(*) FROM moderation m WHERE m.user_id = u.id AND m.type = 'warning') AS warnings,
           (SELECT m.message FROM moderation m WHERE m.user_id = u.id AND m.type = 'ban' ORDER BY m.created_at DESC LIMIT 1) AS ban_reason
    FROM users u
    WHERE u.is_mock = 0
    ORDER BY u.is_banned ASC, u.name ASC
  `).all();
  const moderationLog = await db.prepare(`
    SELECT m.*, u.name AS user_name, a.name AS admin_name
    FROM moderation m
    JOIN users u ON u.id = m.user_id
    LEFT JOIN users a ON a.id = m.sent_by
    ORDER BY m.created_at DESC LIMIT 50
  `).all();
  res.render('admin/moderatie', {
    title: 'Moderatie',
    users,
    moderationLog,
    query: req.query
  });
});

router.post('/admin/moderatie/warn', requireAdmin, async (req, res) => {
  const userId = parseInt(req.body.user_id, 10);
  const message = String(req.body.message || '').trim();
  if (!userId || !message) return res.redirect('/admin/moderatie?error=1');
  await db.prepare('INSERT INTO moderation (user_id, type, message, sent_by) VALUES (?, \'warning\', ?, ?)').run(userId, message, req.session.user.id);
  res.redirect('/admin/moderatie?warned=1');
});

router.post('/admin/moderatie/message', requireAdmin, async (req, res) => {
  const userId = parseInt(req.body.user_id, 10);
  const message = String(req.body.message || '').trim();
  if (!userId || !message) return res.redirect('/admin/moderatie?error=1');
  await db.prepare('INSERT INTO moderation (user_id, type, message, sent_by) VALUES (?, \'warning\', ?, ?)').run(userId, message, req.session.user.id);
  res.redirect('/admin/moderatie?messaged=1');
});

router.post('/admin/moderatie/ban', requireAdmin, async (req, res) => {
  const userId = parseInt(req.body.user_id, 10);
  const message = String(req.body.message || '').trim();
  if (!userId) return res.redirect('/admin/moderatie?error=1');
  await db.prepare('INSERT INTO moderation (user_id, type, message, sent_by) VALUES (?, \'ban\', ?, ?)').run(userId, message || 'Cont suspendat de administrator.', req.session.user.id);
  await db.prepare('UPDATE users SET is_banned = 1 WHERE id = ?').run(userId);
  req.session.destroy && req.session.destroy(() => {});
  res.redirect('/admin/moderatie?banned=1');
});

router.post('/admin/moderatie/unban', requireAdmin, async (req, res) => {
  const userId = parseInt(req.body.user_id, 10);
  if (!userId) return res.redirect('/admin/moderatie?error=1');
  await db.prepare('UPDATE users SET is_banned = 0 WHERE id = ?').run(userId);
  await db.prepare('DELETE FROM moderation WHERE user_id = ? AND type = \'ban\'').run(userId);
  res.redirect('/admin/moderatie?unbanned=1');
});

router.post('/admin/moderatie/delete-log', requireAdmin, async (req, res) => {
  const logId = parseInt(req.body.log_id, 10);
  if (logId) await db.prepare('DELETE FROM moderation WHERE id = ?').run(logId);
  res.redirect('/admin/moderatie?logdeleted=1');
});

router.post('/api/warnings/dismiss', async (req, res) => {
  if (!req.session.user) return res.status(401).json({ error: 'Neautentificat' });
  const warningId = parseInt(req.body.warning_id, 10);
  if (warningId) {
    await db.prepare('DELETE FROM moderation WHERE id = ? AND user_id = ? AND type = \'warning\'').run(warningId, req.session.user.id);
  }
  res.json({ ok: true });
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

router.get('/api/seed-retrigger', async (req, res) => {
  try {
    const { seedMocks } = require('../seed');
    await seedMocks();
    const users = await db.prepare('SELECT COUNT(*) AS c FROM users').get();
    const producers = await db.prepare('SELECT COUNT(*) AS c FROM producers').get();
    const products = await db.prepare('SELECT COUNT(*) AS c FROM products').get();
    const mocks = await db.prepare("SELECT COUNT(*) AS c FROM users WHERE is_mock = 1").get();
    const admins = await db.prepare("SELECT COUNT(*) AS c FROM users WHERE is_admin = 1").get();
    res.json({ ok: true, users: users.c, producers: producers.c, products: products.c, mocks: mocks.c, admins: admins.c });
  } catch (err) {
    res.json({ ok: false, error: err.message, stack: err.stack });
  }
});

module.exports = router;
