export const ensureAuthenticated = (req, res, next) => {
  if (req.isAuthenticated && req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ error: 'Unauthorized' });
};

export const ensureRole = (...roles) => (req, res, next) => {
  if (!req.isAuthenticated || !req.isAuthenticated()) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  if (roles.length === 0 || roles.includes(req.user?.role)) {
    return next();
  }
  res.status(403).json({ error: 'Forbidden' });
};

export const optionalAuth = (req, _res, next) => {
  if (req.isAuthenticated && req.isAuthenticated()) {
    return next();
  }
  next();
};
