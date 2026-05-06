const mongoose = require('mongoose');

const ResultSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  quizId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Quiz',
    required: true,
  },
  attemptId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Attempt',
    required: true,
  },
  totalScore: { type: Number, required: true },
  totalMarks: { type: Number, required: true },
  correct: { type: Number, default: 0 },
  wrong: { type: Number, default: 0 },
  unattempted: { type: Number, default: 0 },
  percentage: { type: Number },
  rank: { type: Number, default: 0 },
  tabSwitchCount: { type: Number, default: 0 },
  timeTaken: { type: Number }, // seconds
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Result', ResultSchema);