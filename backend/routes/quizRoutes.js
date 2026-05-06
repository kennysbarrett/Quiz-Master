const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { adminOnly } = require('../middleware/adminMiddleware');
const {
  getQuizzes,
  getQuizById,
  startQuiz,
  saveAnswer,
  createQuiz,
  updateQuiz,
  deleteQuiz,
} = require('../controllers/quizController');

router.get('/', protect, getQuizzes);
router.get('/:id', protect, getQuizById);
router.post('/:id/start', protect, startQuiz);
router.patch('/attempt/:attemptId/save', protect, saveAnswer);

router.post('/', protect, adminOnly, createQuiz);
router.put('/:id', protect, adminOnly, updateQuiz);
router.delete('/:id', protect, adminOnly, deleteQuiz);

module.exports = router;
