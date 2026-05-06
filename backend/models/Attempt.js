const mongoose = require('mongoose');

const AttemptSchema = new mongoose.Schema({
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
  // answers: { questionId: selectedOption | selectedOptions[] | codeText }
  answers: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    default: {},
  },
  questionIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Question' }],
  tabSwitchCount: { type: Number, default: 0 },
  autoSubmitted: { type: Boolean, default: false },
  startedAt: { type: Date, default: Date.now },
  submittedAt: { type: Date },
  status: {
    type: String,
    enum: ['in-progress', 'submitted'],
    default: 'in-progress',
  },
});

AttemptSchema.index({ userId: 1, quizId: 1, status: 1 });

module.exports = mongoose.model('Attempt', AttemptSchema);
