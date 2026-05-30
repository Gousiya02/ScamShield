import express from 'express';
import { createReport, getReports, upvoteReport } from '../controllers/reportController.js';
import { protect, optionalProtect } from '../middleware/auth.js';

const router = express.Router();

router.post('/', optionalProtect, createReport);
router.get('/', getReports);
router.put('/:id/upvote', optionalProtect, upvoteReport);

export default router;
