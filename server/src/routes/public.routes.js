import { Router } from 'express';
import multer from 'multer';
import {
  publicOverview,
  publicProjects,
  publicDownloadCsv,
  publicExplainChart,
  importStateEmissions,
  stateEmissionMeta,
  stateEmissionSummary,
  stateEmissionTotals,
} from '../controllers/public.controller.js';
import { ensureRole } from '../middleware/auth.js';

const upload = multer();

const r = Router();

// Read-only endpoints
r.get('/overview', publicOverview);
r.get('/projects', publicProjects);
r.get('/download', publicDownloadCsv);   // ?kind=emissions|projects&from=&to=
r.post('/explain', publicExplainChart);  // { chartType, series, filters, sources }
r.get('/state-emissions/meta', stateEmissionMeta);
r.get('/state-emissions', stateEmissionSummary);
r.get('/state-emissions/totals', stateEmissionTotals);
r.post('/state-emissions/import', ensureRole('admin'), upload.single('file'), importStateEmissions);


export default r;
