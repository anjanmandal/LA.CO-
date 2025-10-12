import { Router } from 'express';
import {
  copilotAsk, planTasks, getTemplates, getTemplate, submitFiling, uploadFields
} from '../controllers/copilot.controller.js';

const r = Router();

// RAG Q&A
r.post('/ask', copilotAsk);

// Task engine
r.post('/plan', planTasks);

// Filing templates
r.get('/templates', getTemplates);
r.get('/templates/:id', getTemplate);

// Guided submission (multipart: values as JSON + files[])
r.post('/submit', uploadFields, (req, _res, next) => {  // normalize JSON
  try { if (typeof req.body.values === 'string') req.body.values = JSON.parse(req.body.values); } catch {}
  next();
}, submitFiling);

export default r;
