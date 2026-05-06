import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { saveAnswer, submitQuiz } from '../../services/api';

const QUESTION_STATUS = {
  NOT_ATTEMPTED: 'not-attempted',
  ATTEMPTED: 'attempted',
  MARKED_REVIEW: 'marked-review',
};

const QuizInterface = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [attempt] = useState(() => JSON.parse(sessionStorage.getItem('currentAttempt') || 'null'));
  const [questions] = useState(() => JSON.parse(sessionStorage.getItem('currentQuestions') || '[]'));
  const [quiz] = useState(() => JSON.parse(sessionStorage.getItem('currentQuiz') || 'null'));

  const savedAnswers = attempt?.answers || {};
  const initialTimeLeft = () => {
    const totalSeconds = (quiz?.durationMinutes || 30) * 60;
    const elapsed = attempt?.startedAt
      ? Math.floor((Date.now() - new Date(attempt.startedAt).getTime()) / 1000)
      : 0;
    return Math.max(totalSeconds - elapsed, 0);
  };

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState(savedAnswers);
  const [questionStatus, setQuestionStatus] = useState(() =>
    Object.keys(savedAnswers).reduce((acc, questionId) => {
      const value = savedAnswers[questionId];
      const answered = Array.isArray(value) ? value.length > 0 : value !== undefined && value !== null && value !== '';
      if (answered) acc[questionId] = QUESTION_STATUS.ATTEMPTED;
      return acc;
    }, {})
  );
  const [timeLeft, setTimeLeft] = useState(initialTimeLeft);
  const [tabSwitches, setTabSwitches] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const autoSubmitRef = useRef(false);

  const isAnswered = useCallback((value) => {
    if (Array.isArray(value)) return value.length > 0;
    return value !== undefined && value !== null && value !== '';
  }, []);

  useEffect(() => {
    if (!attempt || !questions.length || !quiz) navigate('/dashboard');
  }, [attempt, questions.length, quiz, navigate]);

  const handleSubmit = useCallback(async (auto = false) => {
    if (submitting || !attempt) return;
    if (!auto) {
      const unattempted = questions.filter((q) => !isAnswered(answers[q._id])).length;
      if (unattempted > 0 && !window.confirm(`${unattempted} questions are not attempted. Submit anyway?`)) return;
    }
    setSubmitting(true);
    try {
      const { data } = await submitQuiz(attempt._id, { autoSubmitted: auto });
      sessionStorage.removeItem('currentAttempt');
      sessionStorage.removeItem('currentQuestions');
      sessionStorage.removeItem('currentQuiz');
      navigate(`/result/${data.result._id}`, { state: { result: data.result } });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Submission failed. Please try again.');
      setSubmitting(false);
    }
  }, [answers, attempt, isAnswered, navigate, questions, submitting]);

  useEffect(() => {
    if (timeLeft <= 0 && !autoSubmitRef.current) {
      autoSubmitRef.current = true;
      handleSubmit(true);
      return undefined;
    }
    const timer = setInterval(() => setTimeLeft((t) => Math.max(t - 1, 0)), 1000);
    return () => clearInterval(timer);
  }, [timeLeft, handleSubmit]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setTabSwitches((prev) => {
          const newCount = prev + 1;
          toast.warning(`⚠️ Tab switch detected! (${newCount} time${newCount > 1 ? 's' : ''})`);
          return newCount;
        });
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  const saveToBackend = useCallback(async (question, answer, switchCount) => {
    try {
      const payload = { questionId: question._id, tabSwitchCount: switchCount };
      if (question.questionType === 'multiple') payload.selectedOptions = answer;
      else if (question.questionType === 'coding') payload.codeAnswer = answer;
      else payload.selectedOption = answer;
      await saveAnswer(attempt._id, payload);
    } catch {
      // Keep local answer even if network save fails; final submit uses backend-saved answers.
      toast.warn('Answer saved locally. Check internet connection for backend sync.', { toastId: 'save-warning' });
    }
  }, [attempt]);

  const updateAnswer = (question, answer) => {
    const qId = question._id;
    const newAnswers = { ...answers, [qId]: answer };
    setAnswers(newAnswers);
    setQuestionStatus((prev) => ({
      ...prev,
      [qId]: isAnswered(answer) ? QUESTION_STATUS.ATTEMPTED : QUESTION_STATUS.NOT_ATTEMPTED,
    }));
    saveToBackend(question, answer, tabSwitches);
  };

  const handleSelectOption = (optionIndex) => {
    const question = questions[currentIndex];
    if (question.questionType === 'multiple') {
      const current = Array.isArray(answers[question._id]) ? answers[question._id] : [];
      const exists = current.includes(optionIndex);
      const next = exists ? current.filter((item) => item !== optionIndex) : [...current, optionIndex].sort();
      updateAnswer(question, next);
      return;
    }
    updateAnswer(question, optionIndex);
  };

  const handleCodingChange = (value) => {
    const question = questions[currentIndex];
    updateAnswer(question, value);
  };

  const clearAnswer = () => {
    const question = questions[currentIndex];
    updateAnswer(question, question.questionType === 'multiple' ? [] : '');
  };

  const toggleMarkForReview = () => {
    const qId = questions[currentIndex]._id;
    setQuestionStatus((prev) => ({
      ...prev,
      [qId]: prev[qId] === QUESTION_STATUS.MARKED_REVIEW
        ? isAnswered(answers[qId]) ? QUESTION_STATUS.ATTEMPTED : QUESTION_STATUS.NOT_ATTEMPTED
        : QUESTION_STATUS.MARKED_REVIEW,
    }));
  };

  if (!quiz || !questions.length) return null;

  const currentQuestion = questions[currentIndex];
  const selectedAnswer = answers[currentQuestion._id];
  const totalSeconds = (quiz.durationMinutes || 30) * 60;
  const progressPercent = Math.min(((totalSeconds - timeLeft) / totalSeconds) * 100, 100);

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const getStatusColor = (qId, idx) => {
    const status = questionStatus[qId] || QUESTION_STATUS.NOT_ATTEMPTED;
    if (idx === currentIndex) return 'bg-blue-600 text-white ring-2 ring-blue-300';
    if (status === QUESTION_STATUS.MARKED_REVIEW) return 'bg-orange-400 text-white';
    if (status === QUESTION_STATUS.ATTEMPTED) return 'bg-green-500 text-white';
    return 'bg-red-100 text-red-700 border border-red-300 dark:bg-red-900 dark:text-red-200';
  };

  const attempted = questions.filter((q) => isAnswered(answers[q._id])).length;
  const markedReview = Object.values(questionStatus).filter((s) => s === QUESTION_STATUS.MARKED_REVIEW).length;
  const notAttempted = questions.length - attempted;
  const isMultiple = currentQuestion.questionType === 'multiple';
  const isCoding = currentQuestion.questionType === 'coding';

  return (
    <div className="flex min-h-screen flex-col bg-gray-100 dark:bg-gray-900">
      <div className="flex items-center justify-between bg-blue-700 px-4 py-3 text-white shadow-md">
        <div>
          <div className="text-lg font-bold">🏆 Quiz Master</div>
          <div className="text-xs text-blue-100">{quiz.title}</div>
        </div>
        <div className="flex items-center gap-4">
          {tabSwitches > 0 && (
            <span className="rounded-full bg-red-500 px-3 py-1 text-xs font-bold text-white">
              ⚠️ Tab switches: {tabSwitches}
            </span>
          )}
          <div className={`font-mono text-2xl font-black ${timeLeft < 300 ? 'animate-pulse text-red-300' : ''}`}>
            ⏱ {formatTime(timeLeft)}
          </div>
          <button onClick={() => handleSubmit(false)} disabled={submitting} className="rounded-xl bg-green-500 px-4 py-2 font-bold text-white transition hover:bg-green-400 disabled:opacity-60">
            {submitting ? 'Submitting...' : '✅ Submit'}
          </button>
        </div>
      </div>

      <div className="h-1.5 bg-gray-200 dark:bg-gray-700">
        <div className="h-full bg-blue-500 transition-all duration-1000" style={{ width: `${progressPercent}%` }} />
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="mx-auto max-w-3xl">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-sm font-semibold text-gray-500 dark:text-gray-400">Question {currentIndex + 1} of {questions.length}</span>
              <div className="flex gap-2">
                <span className={`rounded-full px-3 py-1 text-xs font-bold ${currentQuestion.subject === 'DBMS' ? 'bg-purple-100 text-purple-700' : 'bg-teal-100 text-teal-700'}`}>
                  {currentQuestion.subject}
                </span>
                <span className="rounded-full bg-slate-200 px-3 py-1 text-xs font-bold text-slate-700">
                  {isMultiple ? 'Multiple Answer' : isCoding ? 'Coding' : 'MCQ'}
                </span>
              </div>
            </div>

            <div className="mb-6 rounded-2xl bg-white p-6 shadow-lg dark:bg-gray-800">
              <p className="text-lg font-medium leading-relaxed text-gray-800 dark:text-white">{currentQuestion.questionText}</p>
              {isMultiple && <p className="mt-3 text-sm font-semibold text-orange-600">Select all correct options.</p>}
            </div>

            {!isCoding ? (
              <div className="space-y-3">
                {currentQuestion.options.map((option, i) => {
                  const selected = isMultiple ? Array.isArray(selectedAnswer) && selectedAnswer.includes(i) : selectedAnswer === i;
                  return (
                    <button
                      key={`${currentQuestion._id}-${i}`}
                      onClick={() => handleSelectOption(i)}
                      className={`w-full rounded-xl border-2 px-6 py-4 text-left font-medium transition-all duration-200 ${selected ? 'scale-[1.01] border-blue-500 bg-blue-50 text-blue-700 shadow-md dark:bg-blue-900 dark:text-blue-300' : 'border-gray-200 bg-white text-gray-700 hover:border-blue-300 hover:bg-blue-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-blue-900/30'}`}
                    >
                      <span className={`mr-3 inline-flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold ${selected ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600 dark:bg-gray-600 dark:text-gray-300'}`}>{String.fromCharCode(65 + i)}</span>
                      {option}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="space-y-4">
                {currentQuestion.starterCode && (
                  <pre className="overflow-x-auto rounded-2xl bg-slate-950 p-4 text-sm text-slate-100">{currentQuestion.starterCode}</pre>
                )}
                <textarea
                  value={selectedAnswer || ''}
                  onChange={(e) => handleCodingChange(e.target.value)}
                  placeholder="Write your code/answer here..."
                  className="min-h-64 w-full rounded-2xl border border-slate-300 bg-white p-4 font-mono text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 dark:bg-gray-800 dark:text-white"
                />
                <p className="text-xs text-slate-500">Coding answers are stored for admin/manual review and are not auto-scored by default.</p>
              </div>
            )}

            <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
              <button onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))} disabled={currentIndex === 0} className="rounded-xl border border-gray-300 px-6 py-2 text-gray-600 transition hover:bg-gray-100 disabled:opacity-40 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-700">
                ← Previous
              </button>
              <div className="flex gap-2">
                <button onClick={clearAnswer} className="rounded-xl border border-slate-300 px-5 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100">
                  Clear Answer
                </button>
                <button onClick={toggleMarkForReview} className={`rounded-xl px-5 py-2 text-sm font-semibold transition ${questionStatus[currentQuestion._id] === QUESTION_STATUS.MARKED_REVIEW ? 'bg-orange-400 text-white' : 'border border-orange-400 text-orange-600 hover:bg-orange-50'}`}>
                  🔖 Mark for Review
                </button>
              </div>
              <button onClick={() => setCurrentIndex((i) => Math.min(questions.length - 1, i + 1))} disabled={currentIndex === questions.length - 1} className="rounded-xl border border-gray-300 px-6 py-2 text-gray-600 transition hover:bg-gray-100 disabled:opacity-40 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-700">
                Next →
              </button>
            </div>
          </div>
        </div>

        <aside className="flex w-72 flex-col overflow-y-auto border-l border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-800">
          <div className="border-b border-gray-100 p-4 dark:border-gray-700">
            <p className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-500">Question Palette</p>
            <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 dark:text-gray-400">
              {[{ color: 'bg-green-500', label: `Attempted (${attempted})` }, { color: 'bg-red-100 border border-red-300', label: `Not Attempted (${notAttempted})` }, { color: 'bg-orange-400', label: `Review (${markedReview})` }, { color: 'bg-blue-600', label: 'Current' }].map((item) => (
                <div key={item.label} className="flex items-center gap-2"><div className={`h-4 w-4 rounded ${item.color}`} />{item.label}</div>
              ))}
            </div>
          </div>

          <div className="grid flex-1 grid-cols-5 content-start gap-2 p-4">
            {questions.map((q, idx) => (
              <button key={q._id} onClick={() => setCurrentIndex(idx)} className={`h-10 w-10 rounded-lg text-sm font-bold transition ${getStatusColor(q._id, idx)}`}>
                {idx + 1}
              </button>
            ))}
          </div>

          <div className="border-t border-gray-100 p-4 dark:border-gray-700">
            <button onClick={() => handleSubmit(false)} disabled={submitting} className="w-full rounded-xl bg-green-600 py-3 font-bold text-white transition hover:bg-green-700 disabled:opacity-60">
              {submitting ? 'Submitting...' : '✅ Submit Exam'}
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default QuizInterface;
