import React from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './components/auth/Login';
import Register from './components/auth/Register';
import StudentDashboard from './components/quiz/StudentDashboard';
import QuizInstructions from './components/quiz/QuizInstructions';
import QuizInterface from './components/quiz/QuizInterface';
import ResultPage from './components/result/ResultPage';
import MyResults from './components/result/MyResults';
import Leaderboard from './components/result/Leaderboard';
import AdminDashboard from './components/admin/AdminDashboard';

const LoadingScreen = () => (
  <div className="flex min-h-screen items-center justify-center bg-slate-100 text-slate-600">
    <div className="rounded-3xl bg-white px-8 py-6 text-center shadow ring-1 ring-slate-200">
      <div className="text-3xl">🏆</div>
      <div className="mt-2 font-black">Loading Quiz Master...</div>
    </div>
  </div>
);

const PrivateRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  return user ? children : <Navigate to="/login" replace />;
};

const AdminRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  return user.role === 'admin' ? children : <Navigate to="/dashboard" replace />;
};

function AppRoutes() {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;

  return (
    <Routes>
      <Route path="/" element={<Navigate to={user ? (user.role === 'admin' ? '/admin' : '/dashboard') : '/login'} replace />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/dashboard" element={<PrivateRoute><StudentDashboard /></PrivateRoute>} />
      <Route path="/quiz/:id/instructions" element={<PrivateRoute><QuizInstructions /></PrivateRoute>} />
      <Route path="/quiz/:id/attempt" element={<PrivateRoute><QuizInterface /></PrivateRoute>} />
      <Route path="/result/:resultId" element={<PrivateRoute><ResultPage /></PrivateRoute>} />
      <Route path="/my-results" element={<PrivateRoute><MyResults /></PrivateRoute>} />
      <Route path="/leaderboard/:quizId" element={<PrivateRoute><Leaderboard /></PrivateRoute>} />
      <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="min-h-screen bg-slate-100 transition-colors">
          <AppRoutes />
          <ToastContainer position="top-right" autoClose={3000} theme="colored" />
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
