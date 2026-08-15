const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

function unreadCount(userId) {
  return db.prepare(
    `SELECT COUNT(*) AS c FROM notifications
     WHERE target_user_id = ? AND read = 0`
  ).get(userId).c;
}

router.get('/notificari', requireAuth, (req, res) => {
  const list = db.prepare(`
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
    unread: unreadCount(req.session.user.id)
  });
});

router.post('/notificari/citite', requireAuth, (req, res) => {
  db.prepare('UPDATE notifications SET read = 1 WHERE target_user_id = ?').run(req.session.user.id);
  res.redirect('/notificari');
});

module.exports = router;
module.exports.unreadCount = unreadCount;
