import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import mongoose from 'mongoose';
import api from './routes/index.js';
import { startReminderWorker } from './worker/reminders.js';

const app = express();
app.use(express.json({ limit: '10mb' }));
app.use(morgan('dev'));
app.use(cors({
  origin: [process.env.ALLOWED_ORIGINS || 'http://localhost:5173'],
  credentials: false,
}));


mongoose.set('strictQuery', true);
mongoose.connect(process.env.MONGODB_URI).then(() => {
  console.log('MongoDB connected');
}).catch(err => {
  console.error('MongoDB error', err);
  process.exit(1);
});
startReminderWorker(); // background job for task reminders
// server/src/index.js
app.use((req, res, next) => {
  console.log(`[REQ] ${req.method} ${req.originalUrl}`);
  next();
});

app.use('/api', api);

const port = process.env.PORT || 4000;
app.listen(port, () => console.log(`API running http://localhost:${port}`));
