const mongoose = require('mongoose');

const QuestionSchema = new mongoose.Schema({
  quizId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Quiz',
    required: true,
    index: true,
  },
  questionText: {
    type: String,
    required: [true, 'Question text is required'],
    trim: true,
  },
  questionType: {
    type: String,
    enum: ['mcq', 'multiple', 'coding'],
    default: 'mcq',
  },
  options: {
    type: [String],
    default: [],
    validate: {
      validator: function validateOptions(v) {
        return this.questionType === 'coding' || v.length === 4;
      },
      message: 'Exactly 4 options are required for objective questions',
    },
  },
  correctOption: {
    type: Number,
    min: 0,
    max: 3,
  },
  correctOptions: {
    type: [Number],
    default: undefined,
  },
  starterCode: { type: String, default: '' },
  expectedOutput: { type: String, default: '' },
  subject: {
    type: String,
    enum: ['DBMS', 'Operating Systems'],
    required: true,
  },
  difficulty: {
    type: String,
    enum: ['Easy', 'Medium', 'Hard'],
    default: 'Medium',
  },
  explanation: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now },
});

QuestionSchema.pre('validate', function normalizeCorrectAnswers(next) {
  if (this.questionType === 'mcq') {
    if (this.correctOption === undefined && Array.isArray(this.correctOptions) && this.correctOptions.length) {
      this.correctOption = this.correctOptions[0];
    }
    this.correctOptions = [Number(this.correctOption)];
  }

  if (this.questionType === 'multiple') {
    this.correctOptions = [...new Set((this.correctOptions || []).map(Number))].filter((n) => n >= 0 && n <= 3).sort();
    if (!this.correctOptions.length && this.correctOption !== undefined) {
      this.correctOptions = [Number(this.correctOption)];
    }
    this.correctOption = this.correctOptions[0];
  }

  next();
});

module.exports = mongoose.model('Question', QuestionSchema);
