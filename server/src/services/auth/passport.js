import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import User from '../../models/User.js';

passport.use(new LocalStrategy({
  usernameField: 'email',
  passwordField: 'password',
}, async (email, password, done) => {
  try {
    const user = await User.findOne({ email, isActive: true }).select('+password');
    if (!user) return done(null, false, { message: 'Invalid email or password' });
    const ok = await user.comparePassword(password);
    if (!ok) return done(null, false, { message: 'Invalid email or password' });
    return done(null, { id: user._id, role: user.role, email: user.email, name: user.name, orgId: user.orgId });
  } catch (e) {
    return done(e);
  }
}));

passport.serializeUser((user, done) => {
  // keep the session payload small
  done(null, { id: user.id, role: user.role, orgId: user.orgId });
});

passport.deserializeUser(async (sessionUser, done) => {
  try {
    // re-hydrate minimal info; fetch more if needed
    const { id } = sessionUser;
    const u = await User.findById(id).select('email name role orgId isActive');
    if (!u || !u.isActive) return done(null, false);
    done(null, { id: u._id, email: u.email, name: u.name, role: u.role, orgId: u.orgId });
  } catch (e) {
    done(e);
  }
});

export default passport;
