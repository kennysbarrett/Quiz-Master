const normalizeSelectedOptions = (selected) => {
  if (Array.isArray(selected)) return [...new Set(selected.map(Number))].filter((n) => n >= 0 && n <= 3).sort();
  if (selected === undefined || selected === null || selected === '') return [];
  return [Number(selected)];
};

const arraysEqual = (a, b) => a.length === b.length && a.every((value, index) => value === b[index]);

/**
 * Calculates quiz score with negative marking support.
 * MCQ and multiple-answer questions are auto-scored. Coding questions are stored
 * for review but not auto-scored unless the admin later converts them to MCQ.
 */
const calculateScore = (answers, questions, quiz) => {
  let correct = 0;
  let wrong = 0;
  let unattempted = 0;
  let autoScoredQuestions = 0;

  questions.forEach((question) => {
    const qId = question._id.toString();
    const selected = answers.get ? answers.get(qId) : answers[qId];
    const questionType = question.questionType || 'mcq';

    if (questionType === 'coding') {
      // Coding questions are optional/manual-review questions in this project.
      if (selected === undefined || selected === null || String(selected).trim() === '') unattempted++;
      return;
    }

    autoScoredQuestions++;

    if (selected === undefined || selected === null || (Array.isArray(selected) && selected.length === 0)) {
      unattempted++;
      return;
    }

    if (questionType === 'multiple') {
      const selectedOptions = normalizeSelectedOptions(selected);
      const correctOptions = normalizeSelectedOptions(question.correctOptions && question.correctOptions.length ? question.correctOptions : [question.correctOption]);
      if (arraysEqual(selectedOptions, correctOptions)) correct++;
      else wrong++;
      return;
    }

    if (Number(selected) === Number(question.correctOption)) correct++;
    else wrong++;
  });

  const totalScore = correct * quiz.positiveMarks - wrong * quiz.negativeMarks;
  const totalMarks = autoScoredQuestions * quiz.positiveMarks;
  const percentage = totalMarks ? ((totalScore / totalMarks) * 100).toFixed(2) : 0;

  return {
    correct,
    wrong,
    unattempted,
    totalScore: Math.max(0, totalScore),
    totalMarks,
    percentage: Math.max(0, parseFloat(percentage)),
  };
};

module.exports = { calculateScore, normalizeSelectedOptions, arraysEqual };
