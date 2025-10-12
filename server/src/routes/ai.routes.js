import { Router } from 'express';
import { mapColumns } from '../controllers/ai.controller.js';

const r = Router();
r.post('/map-columns', mapColumns);
export default r;
