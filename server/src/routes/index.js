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

const r = Router();
r.use('/ingest', ingest);
r.use('/ai', ai);
r.use('/emissions', emissions);
r.use('/metrics', metrics);      
r.use('/analytics', analytics);  
r.use('/copilot', copilot);  
r.use('/tasks',tasks); // optional task queue endpoint placeholder
r.use('/ccus', ccus);
r.use('/public', publicRoutes);     
export default r;
