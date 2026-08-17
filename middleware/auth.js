function requireAuth(req, res, next) {
  if (!req.session.user) {
    return res.status(401).redirect('/login?next=' + encodeURIComponent(req.originalUrl));
  }
  next();
}

function requireRole(role) {
  return (req, res, next) => {
    if (!req.session.user) {
      return res.status(401).redirect('/login');
    }
    if (req.session.user.role !== role) {
      return res.status(403).send('Nu ai acces la această pagină.');
    }
    next();
  };
}

function requireAdmin(req, res, next) {
  if (!req.session.user) {
    return res.status(401).redirect('/login?next=' + encodeURIComponent(req.originalUrl));
  }
  if (!req.session.user.is_admin) {
    return res.status(403).send('Doar administratorul are acces.');
  }
  next();
}

function loadUser(req, res, next) {
  res.locals.user = req.session.user || null;
  next();
}

module.exports = { requireAuth, requireRole, requireAdmin, loadUser };
