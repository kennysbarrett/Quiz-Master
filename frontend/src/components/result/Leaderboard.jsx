import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { getLeaderboard } from '../../services/api';

const Leaderboard = () => {
  const { quizId } = useParams();
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadLeaderboard = async () => {
      try {
        const { data } = await getLeaderboard(quizId);
        setRows(data.data || []);
      } catch (err) {
        toast.error(err.response?.data?.message || 'Failed to load leaderboard');
      } finally {
        setLoading(false);
      }
    };
    loadLeaderboard();
  }, [quizId]);

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-600">Loading leaderboard...</div>;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-black text-gray-800 dark:text-white">🏅 Leaderboard</h1>
          <button onClick={() => navigate('/dashboard')} className="px-4 py-2 bg-blue-600 text-white rounded-xl font-semibold">Dashboard</button>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
              <tr>
                <th className="px-4 py-3 text-center">Rank</th>
                <th className="px-4 py-3 text-left">Student</th>
                <th className="px-4 py-3 text-center">Score</th>
                <th className="px-4 py-3 text-center">Percentage</th>
                <th className="px-4 py-3 text-center">Time</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr><td colSpan="5" className="px-4 py-8 text-center text-gray-500">No submissions yet.</td></tr>
              ) : rows.map((r, idx) => (
                <tr key={r._id} className="border-t border-gray-100 dark:border-gray-700 dark:text-gray-200">
                  <td className="px-4 py-3 text-center font-black">#{idx + 1}</td>
                  <td className="px-4 py-3 font-semibold">{r.userId?.name || 'Student'}<div className="text-xs text-gray-500">{r.userId?.registrationNo}</div></td>
                  <td className="px-4 py-3 text-center font-bold text-blue-600">{r.totalScore}/{r.totalMarks}</td>
                  <td className="px-4 py-3 text-center">{r.percentage}%</td>
                  <td className="px-4 py-3 text-center">{Math.floor((r.timeTaken || 0) / 60)}m {(r.timeTaken || 0) % 60}s</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Leaderboard;
