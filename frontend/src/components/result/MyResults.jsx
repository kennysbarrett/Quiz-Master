import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { getMyResults } from '../../services/api';

const MyResults = () => {
  const navigate = useNavigate();
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadResults = async () => {
      try {
        const { data } = await getMyResults();
        setResults(data.data || []);
      } catch (err) {
        toast.error(err.response?.data?.message || 'Failed to load results');
      } finally {
        setLoading(false);
      }
    };
    loadResults();
  }, []);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-gray-600">Loading results...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-black text-gray-800 dark:text-white">📊 My Results</h1>
          <button onClick={() => navigate('/dashboard')} className="px-4 py-2 bg-blue-600 text-white rounded-xl font-semibold">Dashboard</button>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
              <tr>
                <th className="px-4 py-3 text-left">Quiz</th>
                <th className="px-4 py-3 text-center">Score</th>
                <th className="px-4 py-3 text-center">Percentage</th>
                <th className="px-4 py-3 text-center">Correct</th>
                <th className="px-4 py-3 text-center">Wrong</th>
                <th className="px-4 py-3 text-center">Rank</th>
              </tr>
            </thead>
            <tbody>
              {results.length === 0 ? (
                <tr><td colSpan="6" className="px-4 py-8 text-center text-gray-500">No results yet.</td></tr>
              ) : results.map((r) => (
                <tr key={r._id} className="border-t border-gray-100 dark:border-gray-700 dark:text-gray-200">
                  <td className="px-4 py-3 font-semibold">{r.quizId?.title || 'Quiz'}</td>
                  <td className="px-4 py-3 text-center font-bold text-blue-600">{r.totalScore}/{r.totalMarks}</td>
                  <td className="px-4 py-3 text-center">{r.percentage}%</td>
                  <td className="px-4 py-3 text-center text-green-600">{r.correct}</td>
                  <td className="px-4 py-3 text-center text-red-600">{r.wrong}</td>
                  <td className="px-4 py-3 text-center font-bold">#{r.rank}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default MyResults;
