const mongoose = require('mongoose');

const QuizSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Quiz title is required'],
    trim: true,
  },
  description: { type: String, default: '' },
  subject: {
    type: String,
    enum: ['DBMS', 'Operating Systems', 'Mixed', 'Custom'],
    default: 'Mixed',
  },
  totalQuestions: { type: Number, default: 50 },
  durationMinutes: { type: Number, default: 30 },
  positiveMarks: { type: Number, default: 4 },
  negativeMarks: { type: Number, default: 1 },
  isActive: { type: Boolean, default: true },
  isRandomized: { type: Boolean, default: true },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Quiz', QuizSchema);