import { Router } from 'express';
import {
  listProjects, getProject, upsertInjection, getTimeSeries, runGeoAlerts, listAlerts
} from '../controllers/ccus.controller.js';

const r = Router();
r.get('/projects', listProjects);
r.get('/projects/:id', getProject);
r.get('/projects/:id/injection', getTimeSeries);
r.post('/injection', upsertInjection);
r.post('/projects/:id/geo-alerts', runGeoAlerts);
r.get('/projects/:id/alerts', listAlerts);

export default r;
