import { Router } from 'express';
import ingest from './ingest.routes.js';
import ai from './ai.routes.js';          // keep for non-TRACE mapping flows if you want
import emissions from './emissions.routes.js'; // legacy operator upload (optional to keep)
import metrics from './metrics.routes.js';
import analytics from './analytics.routes.js';
import copilot from './copilot.routes.js';
import tasks from './tasks.routes.js'; // optional task queue endpoint placeholder
import ccus from './ccus.routes.js';
import publicRoutes from './public.routes.js';
import authRoutes from './auth.routes.js';
import submissions from './submissions.routes.js';
import { ensureRole } from '../middleware/auth.js';

const r = Router();
r.use('/auth', authRoutes);
r.use('/public', publicRoutes);

r.use('/ingest', ensureRole('operator', 'admin'), ingest);
r.use('/ai', ensureRole('operator', 'admin'), ai);
r.use('/emissions', ensureRole('operator', 'admin'), emissions);
r.use('/metrics', ensureRole('public', 'operator', 'regulator', 'admin'), metrics);      
r.use('/analytics', ensureRole('operator', 'regulator', 'admin'), analytics);  
r.use('/copilot', ensureRole('operator', 'admin'), copilot);  
r.use('/tasks', ensureRole('operator', 'admin'), tasks); // optional task queue endpoint placeholder
r.use('/submissions', submissions);
r.use('/ccus', ensureRole('regulator', 'admin'), ccus);

export default r;
