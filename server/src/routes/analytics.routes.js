// server/src/routes/analytics.routes.js
import { Router } from 'express';
import * as a from '../controllers/analytics.controller.js';
const r = Router();
r.get('/anomalies', a.detectAnomalies);                 // z-score/MAD anomalies + (optional) AI explain
export default r;
