const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');
const { CATEGORY_NAMES } = require('../lib/constants');
const { sendEmail, sendSms } = require('../lib/messaging');

const router = express.Router();

function normalizeIdentifier(value) {
  let s = String(value || '').trim().toLowerCase();
  if (!s) return '';
  if (s.includes('@')) return s;
  const digits = s.replace(/[^\d]/g, '');
  if (!digits) return '';
  if (digits.startsWith('40')) digits = '0' + digits.slice(2);
  if (digits.startsWith('0')) return digits;
  return '0' + digits;
}

router.get('/login', (req, res) => {
  res.render('auth/login', { title: 'Autentificare', error: null, reset: req.query.reset ? 1 : 0, next: req.query.next || '/' });
});

router.post('/login', async (req, res) => {
  const { identifier, password, next } = req.body;
  const norm = normalizeIdentifier(identifier);
  const redirect = typeof next === 'string' && next.startsWith('/') ? next : '/';

  const user = await db.prepare('SELECT * FROM users WHERE phone = ?').get(norm);

  if (!user || !bcrypt.compareSync(password || '', user.password_hash)) {
    const error = 'Număr de telefon sau parolă incorectă.';
    if (req.get('Accept') && req.get('Accept').includes('application/json')) {
      return res.status(401).json({ error });
    }
    return res.status(401).render('auth/login', {
      title: 'Autentificare',
      error,
      reset: 0,
      next: redirect
    });
  }

  if (user.is_banned) {
    const banRecord = await db.prepare('SELECT message, created_at FROM moderation WHERE user_id = ? AND type = \'ban\' ORDER BY created_at DESC LIMIT 1').get(user.id);
    const banMsg = banRecord && banRecord.message ? banRecord.message : 'Contul tău a fost suspendat de administrator.';
    if (req.get('Accept') && req.get('Accept').includes('application/json')) {
      return res.status(403).json({ error: banMsg });
    }
    return res.status(403).render('auth/login', {
      title: 'Autentificare',
      error: banMsg,
      reset: 0,
      next: redirect
    });
  }

  const sessionEmail = user.email && user.email.startsWith('tel:') ? '' : user.email;
  req.session.user = { id: user.id, name: user.name, role: user.role, email: sessionEmail, phone: user.phone, is_admin: !!user.is_admin };

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

router.post('/register', async (req, res) => {
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

  const byPhone = await db.prepare('SELECT id FROM users WHERE phone = ?').get(normalizedPhone);
  if (byPhone) return fail('Există deja un cont cu acest număr de telefon.');

  const emailForDb = `tel:${normalizedPhone}@local`;

  const passwordHash = bcrypt.hashSync(password, 10);
  const result = await db.prepare(
    'INSERT INTO users (role, name, email, phone, password_hash) VALUES (?, ?, ?, ?, ?)'
  ).run(role, String(name).trim(), emailForDb, normalizedPhone, passwordHash);
  const userId = result.lastInsertRowid;

  if (role === 'producer') {
    await db.prepare(
      'INSERT INTO producers (user_id, name, owner_name, phone, whatsapp) VALUES (?, ?, ?, ?, ?)'
    ).run(
      userId,
      String(name).trim(),
      String(owner_name || '').trim(),
      normalizedPhone,
      normalizedPhone
    );

    const realCount = await db.prepare("SELECT COUNT(*) AS c FROM users WHERE role = 'producer' AND is_mock = 0").get();
    const mockCount = await db.prepare("SELECT COUNT(*) AS c FROM users WHERE role = 'producer' AND is_mock = 1").get();
    if (mockCount.c > 0 && realCount.c >= mockCount.c) {
      const mockUsers = await db.prepare("SELECT id FROM users WHERE role = 'producer' AND is_mock = 1 ORDER BY id ASC LIMIT 1").all();
      if (mockUsers.length) {
        await db.prepare("DELETE FROM users WHERE id = ?").run(mockUsers[0].id);
      }
    }
  }

  req.session.user = { id: userId, name: String(name).trim(), role, email: '', phone: normalizedPhone };
  res.redirect(role === 'producer' ? '/dashboard' : '/');
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/'));
});

router.get('/recuperare', (req, res) => {
  res.render('auth/forgot', {
    title: 'Recuperare parolă',
    error: null,
    info: null,
    demo: null,
    form: { identifier: '' }
  });
});

function randomCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function toInternationalPhone(phone) {
  const digits = String(phone || '').replace(/\D/g, '');
  if (digits.startsWith('40')) return digits;
  if (digits.startsWith('0')) return '40' + digits.slice(1);
  return digits;
}

router.post('/recuperare', async (req, res) => {
  const identifier = String(req.body.identifier || '').trim();
  const chosenMethod = req.body.method === 'sms' ? 'sms' : 'email';
  const render = (error, info, demo, whatsappLink) => res.render('auth/forgot', {
    title: 'Recuperare parolă',
    error, info, demo, whatsappLink,
    form: { identifier }
  });

  if (!identifier) return render('Introdu numărul de telefon sau adresa de email.', null, null);

  const isEmail = identifier.includes('@');
  let user;

  if (isEmail) {
    user = await db.prepare('SELECT * FROM users WHERE email = ?').get(identifier.toLowerCase());
    if (!user) return render('Nu am găsit un cont cu această adresă de email.', null, null);
  } else {
    const norm = normalizeIdentifier(identifier);
    if (!norm) return render('Numărul de telefon nu este valid.', null, null);
    user = await db.prepare('SELECT * FROM users WHERE phone = ?').get(norm);
    if (!user) return render('Nu am găsit un cont cu acest număr de telefon.', null, null);
  }

  const realEmail = user.email && !user.email.startsWith('tel:') ? user.email : null;

  let finalMethod = chosenMethod;
  if (chosenMethod === 'email' && !realEmail) {
    return render('Acest cont nu are o adresă de email. Alege varianta SMS.', null, null);
  }

  const code = randomCode();
  const expires = new Date(Date.now() + 15 * 60 * 1000).toISOString();
  await db.prepare('INSERT INTO password_resets (user_id, code, method, expires_at) VALUES (?, ?, ?, ?)')
    .run(user.id, code, finalMethod, expires);

  const waPhone = toInternationalPhone(user.phone);
  const waText = 'Codul meu de recuperare Aprozar Românesc: ' + code;
  const waLink = 'https://wa.me/' + waPhone + '?text=' + encodeURIComponent(waText);

  const message = 'Codul tău de recuperare Aprozar Românesc: ' + code + '. Valabil 15 minute. Dacă nu ai cerut tu, ignoră acest mesaj.';
  const sendPromise = finalMethod === 'email'
    ? sendEmail(realEmail, 'Recuperare parolă Aprozar Românesc', message)
    : sendSms(user.phone, message);

  sendPromise.then(result => {
    if (result.ok) {
      return render(null, 'Ți-am trimis codul pe ' + (finalMethod === 'email' ? 'email' : 'numărul de telefon') + '.', null, null);
    }
    if (result.demo) {
      return render(null, 'Mod demo (fără SMTP/gateway configurat):', 'Codul tău este: ' + code, waLink);
    }
    render('Nu am putut trimite codul. Încearcă din nou sau contactează-ne. Detalii: ' + result.reason, null, null, null);
  });
});

router.get('/recuperare/cod', async (req, res) => {
  const userId = parseInt(req.query.u, 10);
  const user = userId ? await db.prepare('SELECT id, phone FROM users WHERE id = ?').get(userId) : null;
  res.render('auth/reset', {
    title: 'Introdu codul',
    error: null,
    userId: user ? user.id : null,
    phoneMasked: user ? user.phone.slice(0, 3) + '***' + user.phone.slice(-3) : ''
  });
});

router.post('/recuperare/cod', async (req, res) => {
  const userId = parseInt(req.body.userId, 10);
  const code = String(req.body.code || '').trim();
  const render = (error) => res.render('auth/reset', {
    title: 'Introdu codul', error,
    userId, phoneMasked: ''
  });

  if (!userId || !code) return render('Introdu codul primit.');

  const reset = await db.prepare(`
    SELECT * FROM password_resets
    WHERE user_id = ? AND code = ? AND "used" = 0
    ORDER BY id DESC LIMIT 1
  `).get(userId, code);

  if (!reset) return render('Cod incorect. Verifică și încearcă din nou.');
  if (new Date(reset.expires_at) < new Date()) return render('Codul a expirat. Solicită unul nou.');

  await db.prepare('UPDATE password_resets SET "used" = 1 WHERE id = ?').run(reset.id);
  req.session.resetVerifiedUserId = userId;

  res.render('auth/newpass', {
    title: 'Parolă nouă',
    error: null,
    userId
  });
});

router.post('/recuperare/noua', async (req, res) => {
  const userId = parseInt(req.body.userId, 10);
  const password = String(req.body.password || '');
  const password2 = String(req.body.password2 || '');
  const render = (error) => res.render('auth/newpass', { title: 'Parolă nouă', error, userId });

  if (req.session.resetVerifiedUserId !== userId) return res.redirect('/recuperare');
  if (!userId) return res.redirect('/recuperare');
  if (password.length < 6) return render('Parola trebuie să aibă cel puțin 6 caractere.');
  if (password !== password2) return render('Parolele nu coincid.');

  const hash = bcrypt.hashSync(password, 10);
  await db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, userId);
  delete req.session.resetVerifiedUserId;
  res.redirect('/login?reset=1');
});

module.exports = router;
