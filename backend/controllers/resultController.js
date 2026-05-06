const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');
const Attempt = require('../models/Attempt');
const Result = require('../models/Result');
const Question = require('../models/Question');
const Quiz = require('../models/Quiz');
const { calculateScore, normalizeSelectedOptions, arraysEqual } = require('../utils/scoreCalculator');

const isCorrectAnswer = (question, answer) => {
  const questionType = question.questionType || 'mcq';
  if (answer === undefined || answer === null) return false;
  if (questionType === 'multiple') {
    const correctOptions = normalizeSelectedOptions(question.correctOptions && question.correctOptions.length ? question.correctOptions : [question.correctOption]);
    return arraysEqual(normalizeSelectedOptions(answer), correctOptions);
  }
  if (questionType === 'coding') return false;
  return Number(answer) === Number(question.correctOption);
};

// ─── @desc  Submit quiz and calculate result
// ─── @route POST /api/results/submit/:attemptId
// ─── @access Private (Student)
const submitQuiz = async (req, res) => {
  try {
    const { autoSubmitted } = req.body;

    const attempt = await Attempt.findOne({
      _id: req.params.attemptId,
      userId: req.user._id,
      status: 'in-progress',
    });

    if (!attempt) {
      return res.status(404).json({ success: false, message: 'Attempt not found' });
    }

    attempt.status = 'submitted';
    attempt.submittedAt = new Date();
    attempt.autoSubmitted = autoSubmitted || false;
    await attempt.save();

    const questions = await Question.find({ _id: { $in: attempt.questionIds } });
    const quiz = await Quiz.findById(attempt.quizId);
    const questionMap = new Map(questions.map((q) => [q._id.toString(), q]));
    const orderedQuestions = attempt.questionIds.map((id) => questionMap.get(id.toString())).filter(Boolean);

    const scoreData = calculateScore(attempt.answers, orderedQuestions, quiz);
    const timeTaken = Math.floor((attempt.submittedAt - attempt.startedAt) / 1000);

    const result = await Result.create({
      userId: req.user._id,
      quizId: attempt.quizId,
      attemptId: attempt._id,
      ...scoreData,
      tabSwitchCount: attempt.tabSwitchCount,
      timeTaken,
    });

    const betterResults = await Result.countDocuments({
      quizId: attempt.quizId,
      totalScore: { $gt: result.totalScore },
    });
    result.rank = betterResults + 1;
    await result.save();

    const questionsWithAnswers = orderedQuestions.map((q) => {
      const userAnswer = attempt.answers.get(q._id.toString());
      return {
        _id: q._id,
        questionText: q.questionText,
        questionType: q.questionType || 'mcq',
        options: q.options,
        correctOption: q.correctOption,
        correctOptions: q.correctOptions && q.correctOptions.length ? q.correctOptions : [q.correctOption],
        subject: q.subject,
        userAnswer,
        isCorrect: isCorrectAnswer(q, userAnswer),
        explanation: q.explanation,
      };
    });

    res.json({
      success: true,
      result: {
        ...result.toObject(),
        questionsWithAnswers,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── @desc  Get student's result history
// ─── @route GET /api/results/my
// ─── @access Private (Student)
const getMyResults = async (req, res) => {
  try {
    const results = await Result.find({ userId: req.user._id })
      .populate('quizId', 'title subject durationMinutes')
      .sort('-createdAt');

    res.json({ success: true, count: results.length, data: results });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── @desc  Get leaderboard for a quiz
// ─── @route GET /api/results/leaderboard/:quizId
// ─── @access Private
const getLeaderboard = async (req, res) => {
  try {
    const leaderboard = await Result.find({ quizId: req.params.quizId })
      .populate('userId', 'name registrationNo branch')
      .sort('-totalScore timeTaken')
      .limit(20);

    res.json({ success: true, data: leaderboard });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── @desc  Get all results (Admin)
// ─── @route GET /api/results/all
// ─── @access Private (Admin)
const getAllResults = async (req, res) => {
  try {
    const results = await Result.find({})
      .populate('userId', 'name registrationNo branch semester')
      .populate('quizId', 'title subject')
      .sort('-createdAt');

    res.json({ success: true, count: results.length, data: results });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── @desc  Admin analytics summary
// ─── @route GET /api/results/analytics
// ─── @access Private (Admin)
const getAnalytics = async (req, res) => {
  try {
    const [results, quizzes, questions] = await Promise.all([
      Result.find({}).populate('quizId', 'title subject'),
      Quiz.find({}),
      Question.find({}),
    ]);

    const totalStudentsAttempted = new Set(results.map((result) => result.userId.toString())).size;
    const averagePercentage = results.length
      ? Math.round(results.reduce((sum, result) => sum + (Number(result.percentage) || 0), 0) / results.length)
      : 0;
    const highestScore = results.length ? Math.max(...results.map((result) => Number(result.totalScore) || 0)) : 0;

    const quizStatsMap = {};
    results.forEach((result) => {
      const quizId = result.quizId?._id?.toString() || result.quizId?.toString();
      if (!quizId) return;
      if (!quizStatsMap[quizId]) {
        quizStatsMap[quizId] = {
          quizId,
          title: result.quizId?.title || 'Quiz',
          attempts: 0,
          averagePercentage: 0,
          highestScore: 0,
          totalPercentage: 0,
        };
      }
      quizStatsMap[quizId].attempts += 1;
      quizStatsMap[quizId].highestScore = Math.max(quizStatsMap[quizId].highestScore, Number(result.totalScore) || 0);
      quizStatsMap[quizId].totalPercentage += Number(result.percentage) || 0;
    });

    const quizWise = Object.values(quizStatsMap).map((item) => ({
      ...item,
      averagePercentage: item.attempts ? Math.round(item.totalPercentage / item.attempts) : 0,
    }));

    const subjectWise = questions.reduce((acc, question) => {
      const subject = question.subject || 'Other';
      if (!acc[subject]) acc[subject] = { subject, questions: 0 };
      acc[subject].questions += 1;
      return acc;
    }, {});

    res.json({
      success: true,
      data: {
        totalQuizzes: quizzes.length,
        activeQuizzes: quizzes.filter((quiz) => quiz.isActive).length,
        totalQuestions: questions.length,
        totalAttempts: results.length,
        totalStudentsAttempted,
        averagePercentage,
        highestScore,
        quizWise,
        subjectWise: Object.values(subjectWise),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const loadExportRows = async () => {
  const results = await Result.find({})
    .populate('userId', 'name registrationNo branch semester')
    .populate('quizId', 'title subject')
    .sort('-createdAt');

  return results.map((result, index) => ({
    slNo: index + 1,
    student: result.userId?.name || 'Student',
    registrationNo: result.userId?.registrationNo || '',
    branch: result.userId?.branch || '',
    semester: result.userId?.semester || '',
    quiz: result.quizId?.title || 'Quiz',
    subject: result.quizId?.subject || '',
    score: result.totalScore,
    totalMarks: result.totalMarks,
    percentage: result.percentage,
    correct: result.correct,
    wrong: result.wrong,
    unattempted: result.unattempted,
    rank: result.rank,
    tabSwitches: result.tabSwitchCount || 0,
    submittedAt: result.createdAt,
  }));
};

// ─── @desc Export result report as Excel
// ─── @route GET /api/results/export/excel
// ─── @access Private (Admin)
const exportResultsExcel = async (req, res) => {
  try {
    const rows = await loadExportRows();
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Quiz Master';
    const sheet = workbook.addWorksheet('Results');

    sheet.columns = [
      { header: 'Sl No', key: 'slNo', width: 8 },
      { header: 'Student', key: 'student', width: 24 },
      { header: 'Registration No', key: 'registrationNo', width: 18 },
      { header: 'Branch', key: 'branch', width: 12 },
      { header: 'Semester', key: 'semester', width: 12 },
      { header: 'Quiz', key: 'quiz', width: 28 },
      { header: 'Subject', key: 'subject', width: 16 },
      { header: 'Score', key: 'score', width: 10 },
      { header: 'Total Marks', key: 'totalMarks', width: 12 },
      { header: 'Percentage', key: 'percentage', width: 12 },
      { header: 'Correct', key: 'correct', width: 10 },
      { header: 'Wrong', key: 'wrong', width: 10 },
      { header: 'Unattempted', key: 'unattempted', width: 14 },
      { header: 'Rank', key: 'rank', width: 10 },
      { header: 'Tab Switches', key: 'tabSwitches', width: 14 },
      { header: 'Submitted At', key: 'submittedAt', width: 24 },
    ];

    sheet.addRows(rows);
    sheet.getRow(1).font = { bold: true };
    sheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };
    sheet.views = [{ state: 'frozen', ySplit: 1 }];

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="quiz-master-results-${Date.now()}.xlsx"`);
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── @desc Export result report as PDF
// ─── @route GET /api/results/export/pdf
// ─── @access Private (Admin)
const exportResultsPdf = async (req, res) => {
  try {
    const rows = await loadExportRows();
    const doc = new PDFDocument({ margin: 36, size: 'A4', layout: 'landscape' });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="quiz-master-results-${Date.now()}.pdf"`);
    doc.pipe(res);

    doc.fontSize(18).font('Helvetica-Bold').text('Quiz Master - Student Results Report', { align: 'center' });
    doc.moveDown(0.3);
    doc.fontSize(9).font('Helvetica').text(`Generated on: ${new Date().toLocaleString('en-IN')}`, { align: 'center' });
    doc.moveDown(1);

    const startX = 36;
    let y = doc.y;
    const columns = [
      { title: '#', width: 25 },
      { title: 'Student', width: 110 },
      { title: 'Reg No', width: 90 },
      { title: 'Quiz', width: 150 },
      { title: 'Score', width: 55 },
      { title: '%', width: 45 },
      { title: 'C/W/U', width: 65 },
      { title: 'Rank', width: 45 },
      { title: 'Switches', width: 55 },
      { title: 'Submitted', width: 110 },
    ];

    const drawHeader = () => {
      let x = startX;
      doc.rect(startX, y, columns.reduce((sum, c) => sum + c.width, 0), 22).fill('#e2e8f0');
      doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(8);
      columns.forEach((column) => {
        doc.text(column.title, x + 3, y + 7, { width: column.width - 6 });
        x += column.width;
      });
      y += 22;
    };

    drawHeader();
    doc.font('Helvetica').fontSize(8).fillColor('#111827');

    rows.forEach((row) => {
      if (y > 540) {
        doc.addPage({ margin: 36, size: 'A4', layout: 'landscape' });
        y = 36;
        drawHeader();
        doc.font('Helvetica').fontSize(8).fillColor('#111827');
      }
      let x = startX;
      const values = [
        row.slNo,
        row.student,
        row.registrationNo,
        row.quiz,
        `${row.score}/${row.totalMarks}`,
        `${row.percentage}%`,
        `${row.correct}/${row.wrong}/${row.unattempted}`,
        `#${row.rank}`,
        row.tabSwitches,
        new Date(row.submittedAt).toLocaleString('en-IN'),
      ];
      values.forEach((value, index) => {
        doc.text(String(value ?? ''), x + 3, y + 5, { width: columns[index].width - 6, height: 18, ellipsis: true });
        x += columns[index].width;
      });
      y += 22;
      doc.moveTo(startX, y).lineTo(startX + columns.reduce((sum, c) => sum + c.width, 0), y).strokeColor('#e5e7eb').stroke();
    });

    if (!rows.length) {
      doc.moveDown(2).fontSize(12).text('No result submissions available yet.', { align: 'center' });
    }

    doc.end();
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  submitQuiz,
  getMyResults,
  getLeaderboard,
  getAllResults,
  getAnalytics,
  exportResultsExcel,
  exportResultsPdf,
};
