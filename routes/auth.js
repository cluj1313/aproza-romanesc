const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');
const { CATEGORY_NAMES } = require('../lib/constants');

const router = express.Router();

function normalizeIdentifier(value) {
  // Acceptă email sau telefon. Telefon: păstrăm doar cifrele, cu 0 inițial.
  let s = String(value || '').trim().toLowerCase();
  if (!s) return '';
  if (s.includes('@')) return s;
  const digits = s.replace(/[^\d]/g, '');
  if (!digits) return '';
  if (digits.startsWith('40')) digits = '0' + digits.slice(2); // +40 7xx -> 07xx
  if (digits.startsWith('0')) return digits;
  return '0' + digits;
}

router.get('/login', (req, res) => {
  res.render('auth/login', { title: 'Autentificare', error: null, next: req.query.next || '/' });
});

router.post('/login', (req, res) => {
  const { identifier, password, next } = req.body;
  const norm = normalizeIdentifier(identifier);
  const redirect = typeof next === 'string' && next.startsWith('/') ? next : '/';

  const user = db.prepare('SELECT * FROM users WHERE phone = ?').get(norm);

  if (!user || !bcrypt.compareSync(password || '', user.password_hash)) {
    const error = 'Număr de telefon sau parolă incorectă.';
    if (req.get('Accept') && req.get('Accept').includes('application/json')) {
      return res.status(401).json({ error });
    }
    return res.status(401).render('auth/login', {
      title: 'Autentificare',
      error,
      next: redirect
    });
  }

  const sessionEmail = user.email && user.email.startsWith('tel:') ? '' : user.email;
  req.session.user = { id: user.id, name: user.name, role: user.role, email: sessionEmail, phone: user.phone };

  if (req.get('Accept') && req.get('Accept').includes('application/json')) {
    return res.json({ ok: true, redirect: user.role === 'producer' ? '/dashboard' : redirect });
  }
  res.redirect(user.role === 'producer' ? '/dashboard' : redirect);
});

router.get('/register', (req, res) => {
  res.render('auth/register', {
    title: 'Creează cont',
    error: null,
    form: { role: 'customer', name: '', phone: '' }
  });
});

router.post('/register', (req, res) => {
  const { role, name, phone, password, password2, owner_name } = req.body;
  const form = { role, name, phone };

  const fail = (error) => res.status(400).render('auth/register', {
    title: 'Creează cont', error, form
  });

  if (!['producer', 'customer'].includes(role)) return fail('Alege un tip de cont valid.');
  if (!name || !phone || !password) return fail('Toate câmpurile marcate cu * sunt obligatorii.');
  if (password.length < 6) return fail('Parola trebuie să aibă cel puțin 6 caractere.');
  if (password !== password2) return fail('Parolele nu coincid.');

  const normalizedPhone = normalizeIdentifier(phone);
  if (!normalizedPhone) return fail('Numărul de telefon nu este valid.');

  const byPhone = db.prepare('SELECT id FROM users WHERE phone = ?').get(normalizedPhone);
  if (byPhone) return fail('Există deja un cont cu acest număr de telefon.');

  // Email-ul e obligatoriu în baza de date; conturile cu telefon primesc un identificator intern unic
  const emailForDb = `tel:${normalizedPhone}@local`;

  const passwordHash = bcrypt.hashSync(password, 10);
  const result = db.prepare(
    'INSERT INTO users (role, name, email, phone, password_hash) VALUES (?, ?, ?, ?, ?)'
  ).run(role, String(name).trim(), emailForDb, normalizedPhone, passwordHash);
  const userId = result.lastInsertRowid;

  if (role === 'producer') {
    db.prepare(
      'INSERT INTO producers (user_id, name, owner_name, phone, whatsapp) VALUES (?, ?, ?, ?, ?)'
    ).run(
      userId,
      String(name).trim(),
      String(owner_name || '').trim(),
      normalizedPhone,
      normalizedPhone
    );
  }

  req.session.user = { id: userId, name: String(name).trim(), role, email: '', phone: normalizedPhone };
  res.redirect(role === 'producer' ? '/dashboard' : '/');
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/'));
});

module.exports = router;
