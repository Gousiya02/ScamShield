import express from 'express';
import { getQuizzesList, submitQuizScore } from '../controllers/educationController.js';
import { optionalProtect } from '../middleware/auth.js';

const router = express.Router();

router.get('/quizzes', getQuizzesList);
router.post('/submit', optionalProtect, submitQuizScore);

export default router;
