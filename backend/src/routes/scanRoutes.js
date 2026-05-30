import express from 'express';
import { scanContent, getHistory } from '../controllers/scanController.js';
import { protect, optionalProtect } from '../middleware/auth.js';

const router = express.Router();

router.post('/', optionalProtect, scanContent);
router.get('/history', optionalProtect, getHistory);

export default router;
