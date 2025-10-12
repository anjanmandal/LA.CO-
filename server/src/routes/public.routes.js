import { Router } from 'express';
import {
  publicOverview,
  publicProjects,
  publicDownloadCsv,
  publicExplainChart
} from '../controllers/public.controller.js';


const r = Router();

// Read-only endpoints
r.get('/overview', publicOverview);
r.get('/projects', publicProjects);
r.get('/download', publicDownloadCsv);   // ?kind=emissions|projects&from=&to=
r.post('/explain', publicExplainChart);  // { chartType, series, filters, sources }


export default r;
