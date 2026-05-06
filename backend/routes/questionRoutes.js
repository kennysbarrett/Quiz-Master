const express = require('express');
const router = express.Router();
const Question = require('../models/Question');
const Quiz = require('../models/Quiz');
const { protect } = require('../middleware/authMiddleware');
const { adminOnly } = require('../middleware/adminMiddleware');

const normalizeQuestionPayload = (body) => {
  const questionType = body.questionType || 'mcq';
  const options = Array.isArray(body.options) ? body.options.map((item) => String(item || '').trim()) : [];
  const correctOption = body.correctOption !== undefined ? Number(body.correctOption) : undefined;
  const correctOptions = Array.isArray(body.correctOptions)
    ? [...new Set(body.correctOptions.map(Number))].filter((n) => n >= 0 && n <= 3).sort()
    : correctOption !== undefined
      ? [correctOption]
      : [];

  return {
    quizId: body.quizId,
    questionText: String(body.questionText || '').trim(),
    questionType,
    options,
    correctOption,
    correctOptions,
    subject: body.subject,
    difficulty: body.difficulty || 'Medium',
    explanation: String(body.explanation || '').trim(),
    starterCode: String(body.starterCode || ''),
    expectedOutput: String(body.expectedOutput || ''),
  };
};

const validateQuestion = (payload) => {
  if (!payload.quizId || !payload.questionText) {
    return 'Quiz and question text are required';
  }

  if (!['mcq', 'multiple', 'coding'].includes(payload.questionType)) {
    return 'Invalid question type';
  }

  if (payload.questionType !== 'coding') {
    if (!Array.isArray(payload.options) || payload.options.length !== 4 || payload.options.some((item) => !item)) {
      return 'Exactly 4 non-empty options are required';
    }
  }

  if (payload.questionType === 'mcq') {
    if (Number.isNaN(payload.correctOption) || payload.correctOption < 0 || payload.correctOption > 3) {
      return 'Correct option must be between A and D';
    }
  }

  if (payload.questionType === 'multiple' && !payload.correctOptions.length) {
    return 'Select at least one correct option for multiple-answer question';
  }

  return null;
};

// Get questions for a quiz (admin only, includes correct answers)
router.get('/quiz/:quizId', protect, adminOnly, async (req, res) => {
  try {
    const questions = await Question.find({ quizId: req.params.quizId }).sort('createdAt');
    res.json({ success: true, count: questions.length, data: questions });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Create a question (admin only)
router.post('/', protect, adminOnly, async (req, res) => {
  try {
    const payload = normalizeQuestionPayload(req.body);
    const validationError = validateQuestion(payload);
    if (validationError) return res.status(400).json({ success: false, message: validationError });

    const quiz = await Quiz.findById(payload.quizId);
    if (!quiz) return res.status(404).json({ success: false, message: 'Quiz not found' });

    const question = await Question.create(payload);
    res.status(201).json({ success: true, data: question });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Update a question (admin only)
router.put('/:id', protect, adminOnly, async (req, res) => {
  try {
    const existing = await Question.findById(req.params.id);
    if (!existing) return res.status(404).json({ success: false, message: 'Question not found' });

    const payload = normalizeQuestionPayload({ ...existing.toObject(), ...req.body, quizId: existing.quizId });
    const validationError = validateQuestion(payload);
    if (validationError) return res.status(400).json({ success: false, message: validationError });

    const question = await Question.findByIdAndUpdate(req.params.id, payload, {
      new: true,
      runValidators: true,
    });

    res.json({ success: true, data: question, message: 'Question updated successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Delete a question (admin only)
router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    const question = await Question.findByIdAndDelete(req.params.id);
    if (!question) return res.status(404).json({ success: false, message: 'Question not found' });
    res.json({ success: true, message: 'Question deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
