// server/src/routes/metrics.routes.js
import { Router } from 'express';
import * as m from '../controllers/metrics.controller.js';

const r = Router();

// Existing
r.get('/overview', m.overviewBySector);
r.get('/facility/:id/trend', m.facilityTrend);
r.get('/methods', m.methodTimeline);
r.get('/reconciliation/:facilityId', m.reconciliation);

r.get('/capture-storage', m.captureVsStorage);
r.get('/intensity', m.intensityMetrics);
r.get('/recon/explain/:facilityId', m.reconciliationExplain);



export default r;
