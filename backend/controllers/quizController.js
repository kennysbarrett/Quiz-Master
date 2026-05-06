const Quiz = require('../models/Quiz');
const Question = require('../models/Question');
const Attempt = require('../models/Attempt');
const Result = require('../models/Result');
const { shuffleArray } = require('../utils/shuffleArray');

const toSafeQuestion = (q) => ({
  _id: q._id,
  questionText: q.questionText,
  questionType: q.questionType || 'mcq',
  options: q.options,
  starterCode: q.starterCode || '',
  subject: q.subject,
  difficulty: q.difficulty,
});

// @desc    Get all active quizzes
// @route   GET /api/quizzes
// @access  Private
const getQuizzes = async (req, res) => {
  try {
    const filter = req.user.role === 'admin' ? {} : { isActive: true };
    const quizzes = await Quiz.find(filter).select('-__v').sort('-createdAt').lean();

    const quizIds = quizzes.map((quiz) => quiz._id);
    const counts = await Question.aggregate([
      { $match: { quizId: { $in: quizIds } } },
      { $group: { _id: '$quizId', count: { $sum: 1 } } },
    ]);

    const countMap = counts.reduce((acc, item) => {
      acc[item._id.toString()] = item.count;
      return acc;
    }, {});

    const data = quizzes.map((quiz) => ({
      ...quiz,
      questionCount: countMap[quiz._id.toString()] || 0,
      canStart: (countMap[quiz._id.toString()] || 0) >= quiz.totalQuestions && quiz.isActive,
    }));

    res.json({ success: true, count: data.length, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get quiz details
// @route   GET /api/quizzes/:id
// @access  Private
const getQuizById = async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id).select('-__v').lean();
    if (!quiz || (req.user.role !== 'admin' && !quiz.isActive)) {
      return res.status(404).json({ success: false, message: 'Quiz not found or inactive' });
    }

    const questionCount = await Question.countDocuments({ quizId: quiz._id });
    const alreadySubmitted = await Result.exists({ userId: req.user._id, quizId: quiz._id });

    res.json({
      success: true,
      data: {
        ...quiz,
        questionCount,
        canStart: questionCount >= quiz.totalQuestions && quiz.isActive,
        alreadySubmitted: Boolean(alreadySubmitted),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Start a quiz
// @route   POST /api/quizzes/:id/start
// @access  Private
const startQuiz = async (req, res) => {
  try {
    if (req.user.role === 'admin') {
      return res.status(403).json({ success: false, message: 'Admins cannot attempt quizzes from the student panel' });
    }

    const quiz = await Quiz.findById(req.params.id);
    if (!quiz || !quiz.isActive) {
      return res.status(404).json({ success: false, message: 'Quiz not found or inactive' });
    }

    const completedResult = await Result.findOne({ userId: req.user._id, quizId: quiz._id });
    if (completedResult) {
      return res.status(400).json({
        success: false,
        message: 'You have already submitted this quiz',
      });
    }

    const existingAttempt = await Attempt.findOne({
      userId: req.user._id,
      quizId: quiz._id,
      status: 'in-progress',
    });

    if (existingAttempt) {
      const questions = await Question.find({ _id: { $in: existingAttempt.questionIds } });
      const questionMap = new Map(questions.map((q) => [q._id.toString(), q]));
      const orderedQuestions = existingAttempt.questionIds
        .map((questionId) => questionMap.get(questionId.toString()))
        .filter(Boolean)
        .map(toSafeQuestion);

      return res.json({
        success: true,
        attempt: existingAttempt,
        questions: orderedQuestions,
        quiz,
        resumed: true,
      });
    }

    let questions = await Question.find({ quizId: quiz._id });
    if (questions.length < quiz.totalQuestions) {
      return res.status(400).json({
        success: false,
        message: `Quiz needs ${quiz.totalQuestions} questions, only ${questions.length} available`,
      });
    }

    questions = quiz.isRandomized
      ? shuffleArray(questions).slice(0, quiz.totalQuestions)
      : questions.slice(0, quiz.totalQuestions);

    const attempt = await Attempt.create({
      userId: req.user._id,
      quizId: quiz._id,
      questionIds: questions.map((q) => q._id),
      answers: {},
    });

    res.json({
      success: true,
      attempt,
      questions: questions.map(toSafeQuestion),
      quiz,
      resumed: false,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Save answer during quiz
// @route   PATCH /api/quizzes/attempt/:attemptId/save
// @access  Private
const saveAnswer = async (req, res) => {
  try {
    const { questionId, selectedOption, selectedOptions, codeAnswer, tabSwitchCount } = req.body;

    if (!questionId) {
      return res.status(400).json({ success: false, message: 'Question ID is required' });
    }

    const attempt = await Attempt.findOne({
      _id: req.params.attemptId,
      userId: req.user._id,
      status: 'in-progress',
    });

    if (!attempt) {
      return res.status(404).json({ success: false, message: 'Active attempt not found' });
    }

    const question = await Question.findById(questionId).select('questionType');
    if (!question) {
      return res.status(404).json({ success: false, message: 'Question not found' });
    }

    if (question.questionType === 'multiple') {
      const cleanOptions = Array.isArray(selectedOptions)
        ? [...new Set(selectedOptions.map(Number))].filter((n) => n >= 0 && n <= 3).sort()
        : [];
      attempt.answers.set(questionId, cleanOptions);
    } else if (question.questionType === 'coding') {
      attempt.answers.set(questionId, String(codeAnswer || ''));
    } else {
      if (selectedOption === undefined || Number(selectedOption) < 0 || Number(selectedOption) > 3) {
        return res.status(400).json({ success: false, message: 'Invalid selected option' });
      }
      attempt.answers.set(questionId, Number(selectedOption));
    }

    if (tabSwitchCount !== undefined) {
      attempt.tabSwitchCount = Number(tabSwitchCount) || 0;
    }

    await attempt.save();
    res.json({ success: true, message: 'Answer saved' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Admin creates quiz
// @route   POST /api/quizzes
// @access  Private/Admin
const createQuiz = async (req, res) => {
  try {
    const { title, totalQuestions, durationMinutes } = req.body;
    if (!title || Number(totalQuestions) <= 0 || Number(durationMinutes) <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Quiz title, total questions and duration are required',
      });
    }

    const quiz = await Quiz.create({ ...req.body, createdBy: req.user._id });
    res.status(201).json({ success: true, data: quiz });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Admin updates quiz
// @route   PUT /api/quizzes/:id
// @access  Private/Admin
const updateQuiz = async (req, res) => {
  try {
    const allowedFields = [
      'title',
      'description',
      'subject',
      'totalQuestions',
      'durationMinutes',
      'positiveMarks',
      'negativeMarks',
      'isActive',
      'isRandomized',
    ];

    const updates = {};
    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    });

    ['totalQuestions', 'durationMinutes', 'positiveMarks', 'negativeMarks'].forEach((field) => {
      if (updates[field] !== undefined) updates[field] = Number(updates[field]);
    });

    const quiz = await Quiz.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true,
    });

    if (!quiz) {
      return res.status(404).json({ success: false, message: 'Quiz not found' });
    }

    res.json({ success: true, data: quiz, message: 'Quiz updated successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Admin deletes quiz and linked data
// @route   DELETE /api/quizzes/:id
// @access  Private/Admin
const deleteQuiz = async (req, res) => {
  try {
    const quiz = await Quiz.findByIdAndDelete(req.params.id);
    if (!quiz) {
      return res.status(404).json({ success: false, message: 'Quiz not found' });
    }

    await Question.deleteMany({ quizId: req.params.id });
    await Attempt.deleteMany({ quizId: req.params.id });
    await Result.deleteMany({ quizId: req.params.id });

    res.json({ success: true, message: 'Quiz, questions, attempts and results deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getQuizzes,
  getQuizById,
  startQuiz,
  saveAnswer,
  createQuiz,
  updateQuiz,
  deleteQuiz,
};
