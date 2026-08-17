const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

async function unreadCount(userId) {
  const row = await db.prepare(
    `SELECT COUNT(*) AS c FROM notifications
     WHERE target_user_id = ? AND "read" = 0`
  ).get(userId);
  return row ? row.c : 0;
}

router.get('/notificari', requireAuth, async (req, res) => {
  const list = await db.prepare(`
    SELECT n.*, p.name AS producer_name, p.avatar_url
    FROM notifications n
    LEFT JOIN producers p ON p.id = n.producer_id
    WHERE n.target_user_id = ?
    ORDER BY n.created_at DESC
    LIMIT 50
  `).all(req.session.user.id);

  res.render('notifications/index', {
    title: 'Notificări',
    notifications: list,
    unread: await unreadCount(req.session.user.id)
  });
});

router.post('/notificari/citite', requireAuth, async (req, res) => {
  await db.prepare('UPDATE notifications SET "read" = 1 WHERE target_user_id = ?').run(req.session.user.id);
  res.redirect('/notificari');
});

module.exports = router;
module.exports.unreadCount = unreadCount;
