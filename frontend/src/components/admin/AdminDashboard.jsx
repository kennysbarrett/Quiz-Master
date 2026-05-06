import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../../context/AuthContext';
import {
  createQuestion,
  createQuiz,
  deleteQuestion,
  deleteQuiz,
  exportResultsExcel,
  exportResultsPdf,
  getAllResults,
  getAnalytics,
  getQuestionsByQuiz,
  getQuizzes,
  updateQuiz,
} from '../../services/api';

const emptyQuizForm = {
  title: '',
  description: '',
  subject: 'Mixed',
  totalQuestions: 50,
  durationMinutes: 30,
  positiveMarks: 4,
  negativeMarks: 1,
  isActive: true,
  isRandomized: true,
};

const emptyQuestionForm = {
  questionText: '',
  questionType: 'mcq',
  optionA: '',
  optionB: '',
  optionC: '',
  optionD: '',
  correctOption: 0,
  correctOptions: [0],
  subject: 'DBMS',
  difficulty: 'Medium',
  explanation: '',
  starterCode: '',
  expectedOutput: '',
};

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [quizzes, setQuizzes] = useState([]);
  const [results, setResults] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [selectedQuizId, setSelectedQuizId] = useState('');
  const [loading, setLoading] = useState(true);
  const [questionLoading, setQuestionLoading] = useState(false);
  const [quizForm, setQuizForm] = useState(emptyQuizForm);
  const [questionForm, setQuestionForm] = useState(emptyQuestionForm);
  const [editingQuizId, setEditingQuizId] = useState(null);

  const activeQuiz = useMemo(() => quizzes.find((quiz) => quiz._id === selectedQuizId), [quizzes, selectedQuizId]);

  const topScore = useMemo(() => {
    if (!results.length) return 0;
    return Math.max(...results.map((result) => Number(result.totalScore) || 0));
  }, [results]);

  const loadData = async () => {
    try {
      const [quizResponse, resultResponse, analyticsResponse] = await Promise.all([
        getQuizzes(),
        getAllResults(),
        getAnalytics(),
      ]);
      const loadedQuizzes = quizResponse.data.data || [];
      setQuizzes(loadedQuizzes);
      setResults(resultResponse.data.data || []);
      setAnalytics(analyticsResponse.data.data || null);
      if (!selectedQuizId && loadedQuizzes.length) setSelectedQuizId(loadedQuizzes[0]._id);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load admin dashboard');
    } finally {
      setLoading(false);
    }
  };

  const loadQuestions = async (quizId) => {
    if (!quizId) return;
    setQuestionLoading(true);
    try {
      const { data } = await getQuestionsByQuiz(quizId);
      setQuestions(data.data || []);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load questions');
    } finally {
      setQuestionLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (selectedQuizId) loadQuestions(selectedQuizId);
  }, [selectedQuizId]);

  const handleQuizChange = (e) => {
    const { name, value, type, checked } = e.target;
    setQuizForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleQuestionChange = (e) => {
    const { name, value } = e.target;
    setQuestionForm((prev) => {
      const next = { ...prev, [name]: value };
      if (name === 'questionType' && value === 'mcq') next.correctOptions = [Number(next.correctOption) || 0];
      return next;
    });
  };

  const toggleCorrectOption = (index) => {
    setQuestionForm((prev) => {
      const exists = prev.correctOptions.includes(index);
      const correctOptions = exists ? prev.correctOptions.filter((item) => item !== index) : [...prev.correctOptions, index].sort();
      return { ...prev, correctOptions };
    });
  };

  const resetQuizForm = () => {
    setEditingQuizId(null);
    setQuizForm(emptyQuizForm);
  };

  const startEditQuiz = (quiz) => {
    setEditingQuizId(quiz._id);
    setQuizForm({
      title: quiz.title || '',
      description: quiz.description || '',
      subject: quiz.subject || 'Mixed',
      totalQuestions: quiz.totalQuestions || 50,
      durationMinutes: quiz.durationMinutes || 30,
      positiveMarks: quiz.positiveMarks || 4,
      negativeMarks: quiz.negativeMarks || 1,
      isActive: quiz.isActive !== false,
      isRandomized: quiz.isRandomized !== false,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleQuizSubmit = async (e) => {
    e.preventDefault();
    if (!quizForm.title.trim()) return toast.error('Quiz title is required');

    const payload = {
      ...quizForm,
      title: quizForm.title.trim(),
      totalQuestions: Number(quizForm.totalQuestions),
      durationMinutes: Number(quizForm.durationMinutes),
      positiveMarks: Number(quizForm.positiveMarks),
      negativeMarks: Number(quizForm.negativeMarks),
    };

    try {
      if (editingQuizId) {
        await updateQuiz(editingQuizId, payload);
        toast.success('Quiz updated successfully');
        setSelectedQuizId(editingQuizId);
      } else {
        const { data } = await createQuiz(payload);
        toast.success('Quiz created successfully');
        setSelectedQuizId(data.data._id);
      }
      resetQuizForm();
      await loadData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not save quiz');
    }
  };

  const handleDeleteQuiz = async (id) => {
    if (!window.confirm('Delete this quiz with all questions, attempts and results?')) return;
    try {
      await deleteQuiz(id);
      toast.success('Quiz deleted');
      setQuestions([]);
      if (selectedQuizId === id) setSelectedQuizId('');
      if (editingQuizId === id) resetQuizForm();
      await loadData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not delete quiz');
    }
  };

  const buildQuestionPayload = () => {
    const options = [questionForm.optionA, questionForm.optionB, questionForm.optionC, questionForm.optionD].map((item) => item.trim());
    const base = {
      quizId: selectedQuizId,
      questionText: questionForm.questionText.trim(),
      questionType: questionForm.questionType,
      subject: questionForm.subject,
      difficulty: questionForm.difficulty,
      explanation: questionForm.explanation.trim(),
      starterCode: questionForm.starterCode,
      expectedOutput: questionForm.expectedOutput,
    };

    if (questionForm.questionType === 'coding') return { ...base, options: [] };

    return {
      ...base,
      options,
      correctOption: Number(questionForm.correctOption),
      correctOptions: questionForm.questionType === 'multiple'
        ? questionForm.correctOptions
        : [Number(questionForm.correctOption)],
    };
  };

  const handleCreateQuestion = async (e) => {
    e.preventDefault();
    if (!selectedQuizId) return toast.error('Select a quiz first');
    if (!questionForm.questionText.trim()) return toast.error('Question text is required');

    const options = [questionForm.optionA, questionForm.optionB, questionForm.optionC, questionForm.optionD].map((item) => item.trim());
    if (questionForm.questionType !== 'coding' && options.some((item) => !item)) return toast.error('All 4 options are required');
    if (questionForm.questionType === 'multiple' && !questionForm.correctOptions.length) return toast.error('Select at least one correct option');

    try {
      await createQuestion(buildQuestionPayload());
      toast.success('Question added');
      setQuestionForm(emptyQuestionForm);
      await Promise.all([loadQuestions(selectedQuizId), loadData()]);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not add question');
    }
  };

  const handleDeleteQuestion = async (id) => {
    if (!window.confirm('Delete this question?')) return;
    try {
      await deleteQuestion(id);
      toast.success('Question deleted');
      await Promise.all([loadQuestions(selectedQuizId), loadData()]);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not delete question');
    }
  };

  const handleExportExcel = async () => {
    try {
      await exportResultsExcel();
      toast.success('Excel report downloaded');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Excel export failed');
    }
  };

  const handleExportPdf = async () => {
    try {
      await exportResultsPdf();
      toast.success('PDF report downloaded');
    } catch (err) {
      toast.error(err.response?.data?.message || 'PDF export failed');
    }
  };

  if (loading) return <div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-600">Loading admin dashboard...</div>;

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <nav className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 px-6 py-4 shadow-sm backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div>
            <div className="text-xl font-black">🏆 Quiz Master Admin</div>
            <p className="text-xs text-slate-500">Create exams, manage questions, view analytics and export results</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden text-right text-sm sm:block">
              <div className="font-bold">{user?.name}</div>
              <div className="text-xs text-slate-500">{user?.registrationNo}</div>
            </div>
            <button onClick={handleExportPdf} className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-black text-red-700 hover:bg-red-100">PDF</button>
            <button onClick={handleExportExcel} className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-black text-emerald-700 hover:bg-emerald-100">Excel</button>
            <button onClick={() => { logout(); navigate('/login'); }} className="rounded-xl bg-red-500 px-3 py-2 text-sm font-black text-white hover:bg-red-600">Logout</button>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-7xl p-4 sm:p-6">
        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
          {[
            ['Quizzes', analytics?.totalQuizzes ?? quizzes.length, '📚'],
            ['Active', analytics?.activeQuizzes ?? 0, '✅'],
            ['Questions', analytics?.totalQuestions ?? 0, '❓'],
            ['Attempts', analytics?.totalAttempts ?? results.length, '📝'],
            ['Avg %', `${analytics?.averagePercentage ?? 0}%`, '📊'],
            ['Top Score', topScore, '🏆'],
          ].map(([label, value, icon]) => (
            <div key={label} className="rounded-3xl bg-white p-5 text-center shadow-sm ring-1 ring-slate-200">
              <div className="text-2xl">{icon}</div>
              <div className="mt-1 text-2xl font-black text-slate-900">{value}</div>
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</div>
            </div>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-[0.95fr_1.35fr]">
          <section className="space-y-6">
            <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
              <div className="mb-5 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-black">{editingQuizId ? 'Edit Quiz' : 'Create Quiz'}</h2>
                  <p className="text-sm text-slate-500">Set subject, questions, timer and marking scheme.</p>
                </div>
                {editingQuizId && <button onClick={resetQuizForm} className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-black text-slate-600 hover:bg-slate-200">Cancel Edit</button>}
              </div>

              <form onSubmit={handleQuizSubmit} className="space-y-4">
                <input name="title" value={quizForm.title} onChange={handleQuizChange} placeholder="Quiz title" className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />
                <textarea name="description" value={quizForm.description} onChange={handleQuizChange} placeholder="Description / instruction summary" className="min-h-20 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />
                <div className="grid gap-3 sm:grid-cols-2">
                  <select name="subject" value={quizForm.subject} onChange={handleQuizChange} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100">
                    <option>Mixed</option><option>DBMS</option><option>Operating Systems</option><option>Custom</option>
                  </select>
                  <input type="number" min="1" name="totalQuestions" value={quizForm.totalQuestions} onChange={handleQuizChange} placeholder="Total questions" className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />
                  <input type="number" min="1" name="durationMinutes" value={quizForm.durationMinutes} onChange={handleQuizChange} placeholder="Duration in minutes" className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />
                  <div className="grid grid-cols-2 gap-2">
                    <input type="number" min="0" name="positiveMarks" value={quizForm.positiveMarks} onChange={handleQuizChange} placeholder="+ marks" className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />
                    <input type="number" min="0" name="negativeMarks" value={quizForm.negativeMarks} onChange={handleQuizChange} placeholder="- marks" className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="flex items-center gap-2 rounded-2xl bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700"><input type="checkbox" name="isActive" checked={quizForm.isActive} onChange={handleQuizChange} /> Active quiz</label>
                  <label className="flex items-center gap-2 rounded-2xl bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700"><input type="checkbox" name="isRandomized" checked={quizForm.isRandomized} onChange={handleQuizChange} /> Randomize questions</label>
                </div>
                <button className="w-full rounded-2xl bg-blue-600 py-3 font-black text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700">
                  {editingQuizId ? 'Save Quiz Changes' : 'Create Quiz'}
                </button>
              </form>
            </div>

            <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
              <h2 className="mb-4 text-xl font-black">Quiz List</h2>
              <div className="max-h-[520px] space-y-3 overflow-y-auto pr-1">
                {!quizzes.length ? <div className="rounded-2xl bg-slate-50 p-5 text-center text-sm text-slate-500">No quizzes yet.</div> : quizzes.map((quiz) => (
                  <div key={quiz._id} className={`rounded-2xl border p-4 transition ${selectedQuizId === quiz._id ? 'border-blue-400 bg-blue-50' : 'border-slate-200 bg-white hover:bg-slate-50'}`}>
                    <button onClick={() => setSelectedQuizId(quiz._id)} className="w-full text-left">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="font-black">{quiz.title}</div>
                          <div className="mt-1 text-xs text-slate-500">{quiz.subject} • {quiz.questionCount || 0}/{quiz.totalQuestions} questions • {quiz.durationMinutes} min • +{quiz.positiveMarks}/-{quiz.negativeMarks}</div>
                        </div>
                        <span className={`rounded-full px-2 py-1 text-xs font-black ${quiz.canStart ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{quiz.canStart ? 'Ready' : 'Need questions'}</span>
                      </div>
                    </button>
                    <div className="mt-3 flex gap-2">
                      <button onClick={() => startEditQuiz(quiz)} className="rounded-xl bg-blue-50 px-3 py-2 text-xs font-black text-blue-700 hover:bg-blue-100">Edit</button>
                      <button onClick={() => handleDeleteQuiz(quiz._id)} className="rounded-xl bg-red-50 px-3 py-2 text-xs font-black text-red-700 hover:bg-red-100">Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="space-y-6">
            <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                <div>
                  <h2 className="text-xl font-black">Question Manager</h2>
                  <p className="mt-1 text-sm text-slate-500">{activeQuiz ? `Selected: ${activeQuiz.title}` : 'Create or select a quiz to add questions.'}</p>
                </div>
                {activeQuiz && <div className="rounded-2xl bg-slate-100 px-4 py-2 text-sm font-black text-slate-700">{questions.length}/{activeQuiz.totalQuestions} added</div>}
              </div>

              <form onSubmit={handleCreateQuestion} className="mt-5 space-y-4">
                <textarea name="questionText" value={questionForm.questionText} onChange={handleQuestionChange} placeholder="Enter question text" className="min-h-24 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />
                <div className="grid gap-3 sm:grid-cols-3">
                  <select name="questionType" value={questionForm.questionType} onChange={handleQuestionChange} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100">
                    <option value="mcq">MCQ</option>
                    <option value="multiple">Multiple Answers</option>
                    <option value="coding">Coding Optional</option>
                  </select>
                  <select name="subject" value={questionForm.subject} onChange={handleQuestionChange} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"><option>DBMS</option><option>Operating Systems</option></select>
                  <select name="difficulty" value={questionForm.difficulty} onChange={handleQuestionChange} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"><option>Easy</option><option>Medium</option><option>Hard</option></select>
                </div>

                {questionForm.questionType !== 'coding' ? (
                  <>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {[['optionA', 'Option A'], ['optionB', 'Option B'], ['optionC', 'Option C'], ['optionD', 'Option D']].map(([name, placeholder]) => (
                        <input key={name} name={name} value={questionForm[name]} onChange={handleQuestionChange} placeholder={placeholder} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />
                      ))}
                    </div>
                    {questionForm.questionType === 'mcq' ? (
                      <select name="correctOption" value={questionForm.correctOption} onChange={handleQuestionChange} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100">
                        <option value={0}>Correct: A</option><option value={1}>Correct: B</option><option value={2}>Correct: C</option><option value={3}>Correct: D</option>
                      </select>
                    ) : (
                      <div className="rounded-2xl bg-slate-50 p-4">
                        <div className="mb-2 text-sm font-black text-slate-700">Select all correct options</div>
                        <div className="grid grid-cols-4 gap-2">
                          {[0, 1, 2, 3].map((index) => <label key={index} className="flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-sm font-bold"><input type="checkbox" checked={questionForm.correctOptions.includes(index)} onChange={() => toggleCorrectOption(index)} /> {String.fromCharCode(65 + index)}</label>)}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="space-y-3">
                    <textarea name="starterCode" value={questionForm.starterCode} onChange={handleQuestionChange} placeholder="Starter code / boilerplate (optional)" className="min-h-24 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-mono text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />
                    <input name="expectedOutput" value={questionForm.expectedOutput} onChange={handleQuestionChange} placeholder="Expected output / evaluation note (optional)" className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />
                  </div>
                )}

                <input name="explanation" value={questionForm.explanation} onChange={handleQuestionChange} placeholder="Explanation shown after result (optional)" className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />
                <button disabled={!selectedQuizId} className="w-full rounded-2xl bg-emerald-600 py-3 font-black text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50">Add Question</button>
              </form>
            </div>

            <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
              <div className="flex items-center justify-between"><h2 className="text-xl font-black">Questions</h2><button onClick={() => selectedQuizId && loadQuestions(selectedQuizId)} className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-black text-slate-600 hover:bg-slate-200">Refresh</button></div>
              <div className="mt-4 max-h-[520px] space-y-3 overflow-y-auto pr-1">
                {questionLoading ? <div className="rounded-2xl bg-slate-50 p-5 text-center text-sm text-slate-500">Loading questions...</div> : questions.length === 0 ? <div className="rounded-2xl bg-slate-50 p-5 text-center text-sm text-slate-500">No questions added for this quiz.</div> : questions.map((question, index) => {
                  const correctSet = question.correctOptions && question.correctOptions.length ? question.correctOptions : [question.correctOption];
                  return (
                    <div key={question._id} className="rounded-2xl border border-slate-200 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div><div className="text-xs font-black uppercase tracking-wide text-blue-600">Q{index + 1} • {question.subject} • {question.difficulty} • {question.questionType || 'mcq'}</div><p className="mt-1 font-bold text-slate-800">{question.questionText}</p></div>
                        <button onClick={() => handleDeleteQuestion(question._id)} className="rounded-xl bg-red-50 px-3 py-2 text-xs font-black text-red-700 hover:bg-red-100">Delete</button>
                      </div>
                      {question.questionType !== 'coding' ? <div className="mt-3 grid gap-2 sm:grid-cols-2">{question.options.map((option, optionIndex) => <div key={`${question._id}-${optionIndex}`} className={`rounded-xl px-3 py-2 text-sm ${correctSet.includes(optionIndex) ? 'bg-emerald-50 font-bold text-emerald-700 ring-1 ring-emerald-200' : 'bg-slate-50 text-slate-600'}`}>{String.fromCharCode(65 + optionIndex)}. {option}</div>)}</div> : <div className="mt-3 rounded-xl bg-slate-50 p-3 text-sm text-slate-600">Coding/manual-review question</div>}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                <div><h2 className="text-xl font-black">Student Results & Analytics</h2><p className="text-sm text-slate-500">Export results in PDF or Excel format. Top score: {topScore}</p></div>
                <div className="flex gap-2"><button onClick={handleExportPdf} className="rounded-xl bg-red-600 px-4 py-2 text-sm font-black text-white hover:bg-red-700">Export PDF</button><button onClick={handleExportExcel} className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-black text-white hover:bg-emerald-700">Export Excel</button></div>
              </div>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[760px] text-left text-sm">
                  <thead className="bg-slate-100 text-xs uppercase text-slate-500"><tr><th className="px-4 py-3">Student</th><th className="px-4 py-3">Quiz</th><th className="px-4 py-3 text-center">Score</th><th className="px-4 py-3 text-center">%</th><th className="px-4 py-3 text-center">C/W/U</th><th className="px-4 py-3 text-center">Rank</th><th className="px-4 py-3 text-center">Switches</th></tr></thead>
                  <tbody>
                    {results.slice(0, 10).map((result) => <tr key={result._id} className="border-t border-slate-100"><td className="px-4 py-3 font-bold">{result.userId?.name || 'Student'}<div className="text-xs font-normal text-slate-500">{result.userId?.registrationNo}</div></td><td className="px-4 py-3">{result.quizId?.title || 'Quiz'}</td><td className="px-4 py-3 text-center font-black text-blue-600">{result.totalScore}/{result.totalMarks}</td><td className="px-4 py-3 text-center">{result.percentage}%</td><td className="px-4 py-3 text-center">{result.correct}/{result.wrong}/{result.unattempted}</td><td className="px-4 py-3 text-center font-black">#{result.rank}</td><td className="px-4 py-3 text-center">{result.tabSwitchCount || 0}</td></tr>)}
                    {!results.length && <tr><td colSpan="7" className="px-4 py-8 text-center text-slate-500">No submissions yet.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;
