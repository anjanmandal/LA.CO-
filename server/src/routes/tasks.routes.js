// server/src/routes/tasks.routes.js
import { Router } from 'express';
import ComplianceTask from '../models/ComplianceTask.js';

const r = Router();

r.get('/', async (req, res) => {
  const match = {};

  if (req.user?.role !== 'admin') {
    if (req.user?.orgId) {
      match.orgId = req.user.orgId;
    }
  } else if (req.query?.orgId) {
    match.orgId = req.query.orgId;
  }

  const rows = await ComplianceTask.find(match)
    .populate('requirementId', 'code title jurisdiction sector rrule dueTimeLocal')
    .sort({ dueAt: 1 })
    .lean({ virtuals: true });

  res.json(rows);
});

export default r;

// and in routes/index.js: r.use('/tasks', tasksRouter);
