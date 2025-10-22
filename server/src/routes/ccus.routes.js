import { Router } from 'express';
import {
  listProjects, getProject, upsertInjection, getTimeSeries, runGeoAlerts, listAlerts
} from '../controllers/ccus.controller.js';
import {
  createProject,
  updateProject,
  deleteProject,
  createWell,
  updateWell,
  deleteWell,
  createPermit,
  updatePermit,
  deletePermit,
  upsertReading,
} from '../controllers/ccusAdmin.controller.js';

const r = Router();
r.get('/projects', listProjects);
r.get('/projects/:id', getProject);
r.get('/projects/:id/injection', getTimeSeries);
r.post('/injection', upsertInjection);
r.post('/projects/:id/geo-alerts', runGeoAlerts);
r.get('/projects/:id/alerts', listAlerts);

r.post('/projects', createProject);
r.put('/projects/:id', updateProject);
r.delete('/projects/:id', deleteProject);
r.post('/projects/:id/wells', createWell);
r.put('/wells/:id', updateWell);
r.delete('/wells/:id', deleteWell);
r.post('/projects/:id/permits', createPermit);
r.put('/permits/:id', updatePermit);
r.delete('/permits/:id', deletePermit);
r.post('/projects/:id/readings', upsertReading);

export default r;
