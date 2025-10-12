import { Router } from 'express';
import multer from 'multer';
import { uploadFull } from '../controllers/emissions.controller.js';

const upload = multer({ storage: multer.memoryStorage() });
const r = Router();

r.post('/upload-full', upload.single('file'), uploadFull);

export default r;
