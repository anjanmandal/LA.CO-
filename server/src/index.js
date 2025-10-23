import '../loadEnv.js';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import mongoose from 'mongoose';
import session from 'express-session';
import MongoStore from 'connect-mongo';
import api from './routes/index.js';
import { startReminderWorker } from './worker/reminders.js';
import passport from './services/auth/passport.js';

const app = express();
app.set('trust proxy', 1);
app.set('etag', false);

const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:5173')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use((_, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});
app.use(morgan('dev'));

const sessionSecret = process.env.SESSION_SECRET || 'dev-secret-change-me';
if (!process.env.SESSION_SECRET) {
  console.warn('SESSION_SECRET is not set. Using a fallback value – do not use this in production.');
}

app.use(session({
  name: process.env.SESSION_NAME || 'bc.sid',
  secret: sessionSecret,
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGODB_URI,
    collectionName: 'sessions',
    ttl: 60 * 60 * 24 * 14,
  }),
  cookie: {
    httpOnly: true,
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 1000 * 60 * 60 * 24 * 7,
  },
}));

app.use(passport.initialize());
app.use(passport.session());


mongoose.set('strictQuery', true);
mongoose.connect(process.env.MONGODB_URI).then(() => {
}).catch(err => {
  process.exit(1);
});
startReminderWorker(); // background job for task reminders
// server/src/index.js
app.use((req, res, next) => {
  const userTag = req.user ? `${req.user.email} (${req.user.role})` : 'anon';
  next();
});

app.use('/api', api);

const port = process.env.PORT || 4000;
app.listen(port);
