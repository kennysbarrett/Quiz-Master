import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../../context/AuthContext';
import { getQuizzes, getMyResults } from '../../services/api';

const StudentDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [quizzes, setQuizzes] = useState([]);
  const [myResults, setMyResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [darkMode, setDarkMode] = useState(() =>
    document.documentElement.classList.contains('dark')
  );

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [qRes, rRes] = await Promise.all([getQuizzes(), getMyResults()]);
        setQuizzes(qRes.data.data);
        setMyResults(rRes.data.data);
      } catch {
        toast.error('Failed to load data');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const toggleDark = () => {
    setDarkMode((d) => {
      document.documentElement.classList.toggle('dark', !d);
      return !d;
    });
  };

  const getBestScore = () => {
    if (!myResults.length) return 'N/A';
    return Math.max(...myResults.map((r) => r.totalScore));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl text-gray-500">Loading Dashboard...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Navbar */}
      <nav className="bg-blue-700 text-white px-6 py-4 flex items-center justify-between shadow-lg">
        <div className="font-black text-xl">🏆 Quiz Master</div>
        <div className="flex items-center gap-4">
          <button onClick={toggleDark} className="text-xl">{darkMode ? '☀️' : '🌙'}</button>
          <span className="text-blue-200 text-sm">{user?.registrationNo}</span>
          <button onClick={() => { logout(); navigate('/login'); }} className="text-sm bg-red-500 hover:bg-red-400 px-3 py-1 rounded-lg">
            Logout
          </button>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto p-6">
        {/* Welcome */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl p-6 mb-6 shadow-lg">
          <h1 className="text-2xl font-black">Welcome, {user?.name}! 👋</h1>
          <p className="text-blue-200 mt-1">Registration No: {user?.registrationNo}</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Exams Taken', value: myResults.length, icon: '📝' },
            { label: 'Best Score', value: getBestScore(), icon: '🏆' },
            { label: 'Avg Score', value: myResults.length ? Math.round(myResults.reduce((a, r) => a + r.totalScore, 0) / myResults.length) : 'N/A', icon: '📊' },
            { label: 'Available Quizzes', value: quizzes.length, icon: '📚' },
          ].map((s) => (
            <div key={s.label} className="bg-white dark:bg-gray-800 rounded-2xl p-5 text-center shadow">
              <div className="text-3xl">{s.icon}</div>
              <div className="text-2xl font-black text-gray-800 dark:text-white mt-1">{s.value}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Available Quizzes */}
        <h2 className="text-xl font-black text-gray-800 dark:text-white mb-4">📚 Available Exams</h2>
        <div className="grid md:grid-cols-2 gap-5 mb-8">
          {quizzes.map((quiz) => {
            const taken = myResults.find((r) => r.quizId?._id === quiz._id || r.quizId === quiz._id);
            return (
              <div key={quiz._id} className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 border border-gray-100 dark:border-gray-700">
                <div className="flex justify-between items-start mb-3">
                  <h3 className="font-bold text-gray-800 dark:text-white">{quiz.title}</h3>
                  <span className="text-xs font-bold bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 px-2 py-1 rounded-full">
                    {quiz.subject}
                  </span>
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400 space-y-1 mb-4">
                  <p>❓ {quiz.totalQuestions} Questions</p>
                  <p>⏱ {quiz.durationMinutes} Minutes</p>
                  <p>✅ +{quiz.positiveMarks} | ❌ -{quiz.negativeMarks}</p>
                </div>
                {taken ? (
                  <div className="flex gap-2">
                    <div className="flex-1 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-center py-2 rounded-xl text-sm font-semibold">
                      Score: {taken.totalScore}/{taken.totalMarks}
                    </div>
                    <button
                      onClick={() => navigate(`/leaderboard/${quiz._id}`)}
                      className="px-4 py-2 border border-blue-500 text-blue-600 rounded-xl text-sm font-semibold hover:bg-blue-50 dark:hover:bg-blue-900/20"
                    >
                      Leaderboard
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => navigate(`/quiz/${quiz._id}/instructions`)}
                    className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition"
                  >
                    Start Exam →
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Recent Results */}
        {myResults.length > 0 && (
          <>
            <h2 className="text-xl font-black text-gray-800 dark:text-white mb-4">📊 My Performance</h2>
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
                    <th className="px-4 py-3 text-left">Quiz</th>
                    <th className="px-4 py-3 text-center">Score</th>
                    <th className="px-4 py-3 text-center">Correct</th>
                    <th className="px-4 py-3 text-center">Wrong</th>
                    <th className="px-4 py-3 text-center">%</th>
                    <th className="px-4 py-3 text-center">Rank</th>
                  </tr>
                </thead>
                <tbody>
                  {myResults.slice(0, 5).map((r) => (
                    <tr key={r._id} className="border-t border-gray-100 dark:border-gray-700">
                      <td className="px-4 py-3 font-medium text-gray-800 dark:text-white">{r.quizId?.title || 'Quiz'}</td>
                      <td className="px-4 py-3 text-center font-bold text-blue-600">{r.totalScore}/{r.totalMarks}</td>
                      <td className="px-4 py-3 text-center text-green-600">✅ {r.correct}</td>
                      <td className="px-4 py-3 text-center text-red-600">❌ {r.wrong}</td>
                      <td className="px-4 py-3 text-center">{r.percentage}%</td>
                      <td className="px-4 py-3 text-center font-bold">#{r.rank}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default StudentDashboard;