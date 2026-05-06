import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { getQuizDetails, startQuiz } from '../../services/api';

const QuizInstructions = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [quiz, setQuiz] = useState(null);
  const [loading, setLoading] = useState(true);
  const [countdown, setCountdown] = useState(null);
  const [agreed, setAgreed] = useState(false);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    const loadQuiz = async () => {
      try {
        const { data } = await getQuizDetails(id);
        setQuiz(data.data);
      } catch (err) {
        toast.error(err.response?.data?.message || 'Quiz not found');
        navigate('/dashboard');
      } finally {
        setLoading(false);
      }
    };
    loadQuiz();
  }, [id, navigate]);

  useEffect(() => {
    if (countdown === null) return undefined;
    if (countdown === 0) {
      handleStartQuiz();
      return undefined;
    }
    const timer = setTimeout(() => setCountdown((value) => value - 1), 1000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countdown]);

  const beginCountdown = () => {
    if (!agreed) return toast.error('Please read and accept the instructions first');
    if (quiz?.alreadySubmitted) return toast.error('You have already submitted this quiz');
    if (!quiz?.canStart) return toast.error('This quiz is not ready because enough questions are not added');
    setCountdown(10);
  };

  const handleStartQuiz = async () => {
    if (starting) return;
    setStarting(true);
    try {
      const { data } = await startQuiz(id);
      sessionStorage.setItem('currentAttempt', JSON.stringify(data.attempt));
      sessionStorage.setItem('currentQuestions', JSON.stringify(data.questions));
      sessionStorage.setItem('currentQuiz', JSON.stringify(data.quiz));
      if (data.resumed) toast.info('Previous in-progress attempt resumed');
      navigate(`/quiz/${id}/attempt`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not start quiz');
      setCountdown(null);
      setStarting(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-100 text-slate-600">Loading instructions...</div>;
  }

  const rules = [
    `This quiz contains ${quiz.totalQuestions} questions from ${quiz.subject}.`,
    `Total time allowed is ${quiz.durationMinutes} minutes. The quiz will auto-submit when time expires.`,
    `Marking scheme: +${quiz.positiveMarks} for every correct answer and -${quiz.negativeMarks} for every wrong answer.`,
    'Unattempted questions carry 0 marks.',
    'Do not switch tabs or minimize the browser. Every tab switch is recorded for admin review.',
    'A 10-second countdown appears before the quiz starts.',
    'You can navigate to any question using the question panel on the right.',
    'Questions are color-coded: green means attempted, red means not attempted, orange means marked for review.',
    'Once submitted, the quiz cannot be attempted again.',
    'Keep a stable internet connection until final submission.',
  ];

  const disabledStart = quiz?.alreadySubmitted || !quiz?.canStart || starting;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-100 p-4 md:p-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 rounded-3xl bg-white p-6 shadow-xl ring-1 ring-slate-200">
          <button onClick={() => navigate('/dashboard')} className="mb-4 text-sm font-bold text-blue-600 hover:underline">← Back to dashboard</button>
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
            <div>
              <div className="inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-black uppercase tracking-wide text-blue-700">
                Exam Instructions
              </div>
              <h1 className="mt-3 text-3xl font-black text-slate-900">{quiz.title}</h1>
              <p className="mt-2 max-w-2xl text-slate-500">{quiz.description || 'Read all rules carefully before starting the exam.'}</p>
            </div>
            <div className={`rounded-2xl px-4 py-3 text-sm font-black ${quiz.canStart ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
              {quiz.questionCount}/{quiz.totalQuestions} Questions Added
            </div>
          </div>
        </div>

        <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
          {[
            { label: 'Questions', value: quiz.totalQuestions, icon: '❓' },
            { label: 'Duration', value: `${quiz.durationMinutes} min`, icon: '⏱️' },
            { label: 'Correct', value: `+${quiz.positiveMarks}`, icon: '✅' },
            { label: 'Wrong', value: `-${quiz.negativeMarks}`, icon: '❌' },
          ].map((stat) => (
            <div key={stat.label} className="rounded-3xl bg-white p-5 text-center shadow ring-1 ring-slate-200">
              <div className="text-3xl">{stat.icon}</div>
              <div className="mt-2 text-2xl font-black text-slate-900">{stat.value}</div>
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{stat.label}</div>
            </div>
          ))}
        </div>

        {quiz.alreadySubmitted && (
          <div className="mb-6 rounded-3xl border border-red-200 bg-red-50 p-5 text-red-800">
            <strong>Already submitted:</strong> You cannot re-attempt this quiz. Check your dashboard for results and leaderboard.
          </div>
        )}

        {!quiz.canStart && (
          <div className="mb-6 rounded-3xl border border-amber-200 bg-amber-50 p-5 text-amber-800">
            <strong>Quiz not ready:</strong> Admin needs to add at least {quiz.totalQuestions} questions before students can start this exam.
          </div>
        )}

        <div className="mb-6 rounded-3xl bg-white p-6 shadow-xl ring-1 ring-slate-200">
          <h2 className="mb-4 text-xl font-black text-slate-900">📌 Important Rules</h2>
          <ol className="space-y-3">
            {rules.map((rule, index) => (
              <li key={rule} className="flex gap-3 text-sm leading-6 text-slate-700">
                <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-black text-white">
                  {index + 1}
                </span>
                <span>{rule}</span>
              </li>
            ))}
          </ol>
        </div>

        <div className="mb-6 rounded-3xl bg-white p-6 shadow-xl ring-1 ring-slate-200">
          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-1 h-5 w-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm font-semibold leading-6 text-slate-700">
              I have read and understood all exam instructions. I agree to follow the rules and understand that malpractice events such as tab switching will be recorded.
            </span>
          </label>
        </div>

        {countdown !== null ? (
          <div className="rounded-3xl bg-white p-10 text-center shadow-xl ring-1 ring-slate-200">
            <div className="text-7xl font-black text-blue-600">{countdown === 0 ? '🚀' : countdown}</div>
            <p className="mt-3 font-semibold text-slate-500">{countdown === 0 ? 'Starting quiz...' : 'Quiz starting in...'}</p>
          </div>
        ) : (
          <button
            onClick={beginCountdown}
            disabled={!agreed || disabledStart}
            className="w-full rounded-3xl bg-blue-600 py-5 text-xl font-black text-white shadow-xl shadow-blue-600/20 transition hover:-translate-y-0.5 hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
          >
            {starting ? 'Starting...' : '🚀 Start Exam'}
          </button>
        )}
      </div>
    </div>
  );
};

export default QuizInstructions;
