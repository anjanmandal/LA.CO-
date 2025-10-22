import { Router } from 'express';
import passport from '../services/auth/passport.js';
import { ensureAuthenticated } from '../middleware/auth.js';

const r = Router();

r.post('/login', (req, res, next) => {
  passport.authenticate('local', (err, user, info) => {
    if (err) return next(err);
    if (!user) {
      return res.status(401).json({ error: info?.message || 'Invalid email or password' });
    }
    req.logIn(user, loginErr => {
      if (loginErr) return next(loginErr);
      res.json({ user: req.user });
    });
  })(req, res, next);
});

r.post('/logout', ensureAuthenticated, (req, res, next) => {
  req.logout(logoutErr => {
    if (logoutErr) return next(logoutErr);
    req.session.destroy(err => {
      if (err) return next(err);
      res.clearCookie(process.env.SESSION_NAME || 'bc.sid');
      res.sendStatus(204);
    });
  });
});

r.get('/me', (req, res) => {
  if (!req.isAuthenticated || !req.isAuthenticated()) {
    return res.status(200).json({ user: null });
  }
  res.json({ user: req.user });
});

export default r;
