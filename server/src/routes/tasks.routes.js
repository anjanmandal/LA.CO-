// server/src/routes/tasks.routes.js
import { Router } from 'express';
import ComplianceTask from '../models/ComplianceTask.js';
const r = Router();
r.get('/', async (req,res)=> {
  const rows = await ComplianceTask.find().sort({ dueAt:1 }).lean();
  res.json(rows);
});
export default r;

// and in routes/index.js: r.use('/tasks', tasksRouter);
