import { Router } from 'express';
import { listOrgSubmissions, updateSubmissionStatus } from '../controllers/submissions.controller.js';
import { ensureRole } from '../middleware/auth.js';

const r = Router();

r.get('/', ensureRole('regulator', 'admin'), listOrgSubmissions);
r.get('/mine', ensureRole('operator', 'admin'), listOrgSubmissions);
r.patch('/:id/status', ensureRole('regulator', 'admin'), updateSubmissionStatus);

export default r;
