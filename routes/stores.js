const express = require('express');
const db = require('../db');
const { haversineKm, formatDistance } = require('../lib/geo');

const router = express.Router();

router.get('/magazine', (req, res) => {
  const { lat, lng } = req.session.location || {};
  const all = db.prepare('SELECT * FROM stores ORDER BY county, city').all();

  let stores = all.map(s => ({ ...s, distanceKm: null, distanceLabel: null }));
  if (lat != null && lng != null) {
    stores = all
      .map(s => {
        const d = haversineKm(lat, lng, s.lat, s.lng);
        return { ...s, distanceKm: d, distanceLabel: formatDistance(d) };
      })
      .sort((a, b) => a.distanceKm - b.distanceKm);
  }

  if (req.query.nearest) {
    const nearest = stores[0] || null;
    return res.json({ store: nearest });
  }

  res.render('stores/index', {
    title: 'Magazine Dor de Casă',
    stores,
    hasLocation: lat != null && lng != null,
    total: all.length
  });
});

router.post('/api/location', express.json(), (req, res) => {
  const lat = parseFloat(req.body.lat);
  const lng = parseFloat(req.body.lng);
  if (isNaN(lat) || isNaN(lng)) return res.status(400).json({ error: 'Coordonate invalide' });
  req.session.location = { lat, lng };
  res.cookie('aprozar_loc', lat + ',' + lng, {
    httpOnly: false,
    maxAge: 1000 * 60 * 60 * 24 * 365,
    sameSite: 'lax'
  });
  res.json({ ok: true });
});

module.exports = router;
