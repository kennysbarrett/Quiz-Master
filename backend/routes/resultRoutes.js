const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { adminOnly } = require('../middleware/adminMiddleware');
const {
  submitQuiz,
  getMyResults,
  getLeaderboard,
  getAllResults,
  getAnalytics,
  exportResultsExcel,
  exportResultsPdf,
} = require('../controllers/resultController');

router.post('/submit/:attemptId', protect, submitQuiz);
router.get('/my', protect, getMyResults);
router.get('/leaderboard/:quizId', protect, getLeaderboard);
router.get('/all', protect, adminOnly, getAllResults);
router.get('/analytics', protect, adminOnly, getAnalytics);
router.get('/export/excel', protect, adminOnly, exportResultsExcel);
router.get('/export/pdf', protect, adminOnly, exportResultsPdf);

module.exports = router;
