import { Router } from 'express';
import multer from 'multer';
import { preview, commit } from '../controllers/ingest.controller.js';

const r = Router();
const upload = multer({ storage: multer.memoryStorage() });

r.post('/preview', upload.single('file'), preview);
r.post('/commit', upload.single('file'), commit);

export default r;
