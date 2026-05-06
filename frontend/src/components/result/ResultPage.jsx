import React from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Doughnut, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS, ArcElement, Tooltip, Legend,
  CategoryScale, LinearScale, BarElement, Title,
} from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title);

const ResultPage = () => {
  const { state } = useLocation();
  const navigate = useNavigate();
  const result = state?.result;

  if (!result) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Result not found.</p>
          <button onClick={() => navigate('/dashboard')} className="px-6 py-2 bg-blue-600 text-white rounded-xl">
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const { correct, wrong, unattempted, totalScore, totalMarks, percentage, rank, timeTaken, questionsWithAnswers = [] } = result;

  const normalizeOptions = (value) => {
    if (Array.isArray(value)) return value.map(Number).sort();
    if (value === undefined || value === null || value === '') return [];
    return [Number(value)];
  };

  const sameOptions = (a, b) => a.length === b.length && a.every((item, index) => item === b[index]);

  const answerLabel = (q, value) => {
    const indexes = normalizeOptions(value);
    if (!indexes.length) return 'Not attempted';
    if (q.questionType === 'coding') return String(value || 'Code answer submitted');
    return indexes.map((index) => q.options?.[index]).filter(Boolean).join(', ');
  };

  const questionCorrect = (q) => {
    if (q.questionType === 'coding') return false;
    const correctOptions = normalizeOptions(q.correctOptions?.length ? q.correctOptions : q.correctOption);
    return sameOptions(normalizeOptions(q.userAnswer), correctOptions);
  };

  const minutes = Math.floor(timeTaken / 60);
  const seconds = timeTaken % 60;

  const doughnutData = {
    labels: ['Correct', 'Wrong', 'Unattempted'],
    datasets: [{
      data: [correct, wrong, unattempted],
      backgroundColor: ['#22c55e', '#ef4444', '#94a3b8'],
      borderWidth: 0,
    }],
  };

  const subjectStats = questionsWithAnswers.reduce((acc, q) => {
    const sub = q.subject || 'Other';
    if (!acc[sub]) acc[sub] = { correct: 0, wrong: 0, unattempted: 0 };
    if (q.userAnswer === undefined || q.userAnswer === null) acc[sub].unattempted++;
    else if (questionCorrect(q)) acc[sub].correct++;
    else acc[sub].wrong++;
    return acc;
  }, {});

  const barData = {
    labels: Object.keys(subjectStats),
    datasets: [
      { label: 'Correct', data: Object.values(subjectStats).map(s => s.correct), backgroundColor: '#22c55e' },
      { label: 'Wrong', data: Object.values(subjectStats).map(s => s.wrong), backgroundColor: '#ef4444' },
      { label: 'Unattempted', data: Object.values(subjectStats).map(s => s.unattempted), backgroundColor: '#94a3b8' },
    ],
  };

  const grade = percentage >= 90 ? 'A+' : percentage >= 80 ? 'A' : percentage >= 70 ? 'B' : percentage >= 60 ? 'C' : percentage >= 40 ? 'D' : 'F';
  const gradeColor = grade === 'A+' || grade === 'A' ? 'text-green-600' : grade === 'B' ? 'text-blue-600' : grade === 'C' ? 'text-yellow-600' : 'text-red-600';

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Result Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-2xl p-8 mb-6 text-center shadow-xl">
          <div className="text-6xl font-black mb-2">{totalScore}</div>
          <div className="text-blue-200">out of {totalMarks} marks</div>
          <div className={`text-5xl font-black mt-4 ${gradeColor} bg-white rounded-2xl py-2 px-6 inline-block`}>
            Grade: {grade}
          </div>
          <div className="mt-4 text-2xl font-bold">{percentage}%</div>
          <div className="text-blue-200 mt-1">🏅 Rank #{rank} • ⏱ {minutes}m {seconds}s</div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Correct', value: correct, icon: '✅', bg: 'bg-green-50 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-400' },
            { label: 'Wrong', value: wrong, icon: '❌', bg: 'bg-red-50 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-400' },
            { label: 'Unattempted', value: unattempted, icon: '⬜', bg: 'bg-gray-50 dark:bg-gray-800', text: 'text-gray-700 dark:text-gray-400' },
            { label: 'Your Rank', value: `#${rank}`, icon: '🏅', bg: 'bg-blue-50 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-400' },
          ].map((s) => (
            <div key={s.label} className={`${s.bg} rounded-2xl p-4 text-center shadow`}>
              <div className="text-2xl">{s.icon}</div>
              <div className={`text-3xl font-black ${s.text} mt-1`}>{s.value}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Charts */}
        <div className="grid md:grid-cols-2 gap-6 mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow">
            <h3 className="font-bold text-gray-700 dark:text-gray-300 mb-4">Score Distribution</h3>
            <Doughnut data={doughnutData} options={{ plugins: { legend: { position: 'bottom' } } }} />
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow">
            <h3 className="font-bold text-gray-700 dark:text-gray-300 mb-4">Subject-wise Performance</h3>
            <Bar data={barData} options={{ responsive: true, plugins: { legend: { position: 'bottom' } }, scales: { x: { stacked: true }, y: { stacked: true } } }} />
          </div>
        </div>

        {/* Answer Review */}
        {questionsWithAnswers.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow p-6 mb-6">
            <h3 className="font-bold text-gray-800 dark:text-white text-lg mb-4">📝 Answer Review</h3>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {questionsWithAnswers.map((q, idx) => {
                const isCorrect = questionCorrect(q);
                const isSkipped = q.userAnswer === undefined || q.userAnswer === null || (Array.isArray(q.userAnswer) && q.userAnswer.length === 0) || q.userAnswer === '';
                return (
                  <div key={idx} className={`p-4 rounded-xl border ${
                    isSkipped ? 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900'
                    : isCorrect ? 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20'
                    : 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20'
                  }`}>
                    <div className="flex items-start gap-2">
                      <span>{isSkipped ? '⬜' : isCorrect ? '✅' : '❌'}</span>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                          Q{idx + 1}: {q.questionText}
                        </p>
                        <div className="mt-2 text-xs space-y-1">
                          <p className="text-green-600 dark:text-green-400">
                            ✔ Correct: {answerLabel(q, q.correctOptions?.length ? q.correctOptions : q.correctOption)}
                          </p>
                          {!isSkipped && !isCorrect && (
                            <p className="text-red-600 dark:text-red-400">
                              ✘ Your answer: {answerLabel(q, q.userAnswer)}
                            </p>
                          )}
                          {isSkipped && (
                            <p className="text-gray-500">Not attempted</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-4">
          <button onClick={() => navigate('/dashboard')} className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition">
            🏠 Dashboard
          </button>
          <button onClick={() => navigate('/my-results')} className="flex-1 py-3 border border-blue-600 text-blue-600 font-bold rounded-xl hover:bg-blue-50 dark:hover:bg-blue-900/20 transition">
            📊 My History
          </button>
        </div>
      </div>
    </div>
  );
};

export default ResultPage;