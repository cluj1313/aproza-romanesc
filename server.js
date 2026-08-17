const path = require('path');
const express = require('express');
const session = require('express-session');

require('./db');
// Dacă baza de date e goală (ex: primul start sau repornire pe hosting gratuit),
// se repopulează automat datele demo. Seed-ul nu suprascrie datele existente.
require('./seed');
const { loadUser, requireAuth } = require('./middleware/auth');
const authRoutes = require('./routes/auth');
const catalogRoutes = require('./routes/catalog');
const producerRoutes = require('./routes/producer');
const storeRoutes = require('./routes/stores');
const cartRoutes = require('./routes/cart');
const notificationRoutes = require('./routes/notifications');
const { unreadCount } = require('./routes/notifications');
const { cartSummary } = require('./routes/cart');

const app = express();
const PORT = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const SqliteStore = require('better-sqlite3-session-store')(session);
const db = require('./db');

app.use(session({
  store: new SqliteStore({
    client: db,
    expired: { clear: true, intervalMs: 900000 }
  }),
  secret: process.env.SESSION_SECRET || 'schimba_aceasta_cheie_in_productie',
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, maxAge: 1000 * 60 * 60 * 24 * 7 }
}));

app.use(loadUser);

function parseCookies(header) {
  const out = {};
  String(header || '').split(';').forEach(part => {
    const idx = part.indexOf('=');
    if (idx > -1) out[part.slice(0, idx).trim()] = decodeURIComponent(part.slice(idx + 1).trim());
  });
  return out;
}

app.use((req, res, next) => {
  if (!req.session.location) {
    const raw = parseCookies(req.headers.cookie).aprozar_loc;
    if (raw) {
      const [lat, lng] = raw.split(',').map(parseFloat);
      if (!isNaN(lat) && !isNaN(lng)) req.session.location = { lat, lng };
    }
  }
  next();
});

app.use((req, res, next) => {
  res.locals.cartCount = cartSummary(req).count;
  res.locals.unreadNotifs = req.session.user ? unreadCount(req.session.user.id) : 0;
  next();
});

app.use(authRoutes);
app.use('/', catalogRoutes);
app.use(storeRoutes);
app.use(cartRoutes);
app.use(notificationRoutes);
app.use(producerRoutes);

app.get('/contul-meu', requireAuth, (req, res) => {
  const isProducer = req.session.user.role === 'producer';
  res.render('account/index', {
    title: 'Contul meu',
    isProducer,
    cartCount: cartSummary(req).count
  });
});

app.use((req, res) => {
  res.status(404).render('misc/notfound', {
    title: 'Pagina nu există',
    cartCount: cartSummary(req).count
  });
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).render('misc/error', {
    title: 'Eroare',
    message: err.message || 'A apărut o eroare.',
    cartCount: cartSummary(req).count
  });
});

app.listen(PORT, () => {
  console.log(`✅ Aprozar Românesc rulează: http://localhost:${PORT}`);
});
