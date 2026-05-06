import React, { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../../context/AuthContext';
import { healthCheck, loginUser } from '../../services/api';

const Login = () => {
  const [form, setForm] = useState({ registrationNo: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [apiOnline, setApiOnline] = useState(null);
  const { login, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;
    healthCheck()
      .then(() => mounted && setApiOnline(true))
      .catch(() => mounted && setApiOnline(false));
    return () => {
      mounted = false;
    };
  }, []);

  if (user) {
    return <Navigate to={user.role === 'admin' ? '/admin' : '/dashboard'} replace />;
  }

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const fillAdminDemo = () => {
    setForm({ registrationNo: 'ADMIN001', password: 'Admin@123' });
    toast.info('Demo admin credentials added. Run npm run seed in backend first.');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.registrationNo.trim() || !form.password) {
      return toast.error('Please enter registration number and password');
    }

    setLoading(true);
    try {
      const { data } = await loginUser({
        registrationNo: form.registrationNo.trim(),
        password: form.password,
      });
      login(data.user, data.token);
      toast.success(`Welcome back, ${data.user.name}!`);
      navigate(data.user.role === 'admin' ? '/admin' : '/dashboard', { replace: true });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed. Check backend and credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-blue-600/30 blur-3xl" />
        <div className="absolute right-0 top-20 h-96 w-96 rounded-full bg-indigo-500/20 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-cyan-500/20 blur-3xl" />
      </div>

      <div className="relative mx-auto grid min-h-screen max-w-7xl lg:grid-cols-2">
        <section className="hidden flex-col justify-between p-10 lg:flex">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-sm text-blue-100 backdrop-blur">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              B.Tech Major Project Portal
            </div>
            <h1 className="mt-8 text-5xl font-black leading-tight tracking-tight xl:text-6xl">
              Quiz Master
              <span className="block bg-gradient-to-r from-blue-300 to-cyan-200 bg-clip-text text-transparent">
                Secure Online Exam System
              </span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-slate-300">
              A full-stack quiz platform with JWT authentication, student dashboard, admin control panel,
              leaderboard, result analytics, timer-based exam flow, and malpractice tracking.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-4">
            {[
              ['JWT Auth', 'Secure login'],
              ['Admin Panel', 'Quiz control'],
              ['Analytics', 'Scores & ranks'],
            ].map(([title, text]) => (
              <div key={title} className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur">
                <div className="text-xl font-black">{title}</div>
                <div className="mt-1 text-sm text-slate-300">{text}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="flex items-center justify-center p-4 sm:p-8">
          <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white p-6 text-slate-900 shadow-2xl sm:p-8">
            <div className="mb-8 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600 text-3xl shadow-lg shadow-blue-600/30">
                🏆
              </div>
              <h2 className="text-3xl font-black tracking-tight">Sign in</h2>
              <p className="mt-2 text-sm text-slate-500">Use your registration number and password</p>
              <div className={`mx-auto mt-4 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold ${apiOnline ? 'bg-emerald-50 text-emerald-700' : apiOnline === false ? 'bg-red-50 text-red-700' : 'bg-slate-100 text-slate-600'}`}>
                <span className={`h-2 w-2 rounded-full ${apiOnline ? 'bg-emerald-500' : apiOnline === false ? 'bg-red-500' : 'bg-slate-400'}`} />
                {apiOnline ? 'Backend connected' : apiOnline === false ? 'Backend offline' : 'Checking backend'}
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">Registration Number</label>
                <input
                  type="text"
                  name="registrationNo"
                  value={form.registrationNo}
                  onChange={handleChange}
                  placeholder="e.g. 2101289036"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-semibold outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
                  autoComplete="username"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={form.password}
                    onChange={handleChange}
                    placeholder="Enter password"
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 pr-14 font-semibold outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-xl px-2 py-1 text-sm text-slate-500 hover:bg-slate-100"
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-2xl bg-blue-600 py-3.5 text-base font-black text-white shadow-lg shadow-blue-600/25 transition hover:-translate-y-0.5 hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>

            <div className="mt-5 rounded-2xl border border-dashed border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-black">Admin demo</p>
                  <p className="text-xs text-blue-700">Seed backend first to create ADMIN001 / Admin@123</p>
                </div>
                <button onClick={fillAdminDemo} className="rounded-xl bg-white px-3 py-2 text-xs font-black text-blue-700 shadow hover:bg-blue-100">
                  Use
                </button>
              </div>
            </div>

            <p className="mt-6 text-center text-sm text-slate-500">
              New student?{' '}
              <Link to="/register" className="font-black text-blue-600 hover:underline">
                Create an account
              </Link>
            </p>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Login;
