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

function loadUser(req, res, next) {
  res.locals.user = req.session.user || null;
  next();
}

module.exports = { requireAuth, requireRole, loadUser };
