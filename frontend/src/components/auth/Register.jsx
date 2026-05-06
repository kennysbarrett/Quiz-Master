import React, { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../../context/AuthContext';
import { registerUser } from '../../services/api';

const initialForm = {
  registrationNo: '',
  name: '',
  email: '',
  password: '',
  confirmPassword: '',
  branch: 'CSE',
  semester: '8th',
};

const Register = () => {
  const navigate = useNavigate();
  const { login, user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState(initialForm);

  if (user) {
    return <Navigate to={user.role === 'admin' ? '/admin' : '/dashboard'} replace />;
  }

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const validate = () => {
    if (!form.name.trim() || !form.registrationNo.trim() || !form.password) {
      toast.error('Name, registration number and password are required');
      return false;
    }
    if (form.email.trim() && !/^\S+@\S+\.\S+$/.test(form.email)) {
      toast.error('Enter a valid email address or leave it blank');
      return false;
    }
    if (form.password.length < 6) {
      toast.error('Password must be at least 6 characters long');
      return false;
    }
    if (form.password !== form.confirmPassword) {
      toast.error('Passwords do not match');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      const payload = {
        registrationNo: form.registrationNo.trim(),
        name: form.name.trim(),
        email: form.email.trim() || undefined,
        password: form.password,
        branch: form.branch,
        semester: form.semester,
      };
      const { data } = await registerUser(payload);
      login(data.user, data.token);
      toast.success('Registration successful');
      navigate('/dashboard', { replace: true });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 p-4 text-slate-900 sm:p-8">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute left-10 top-10 h-72 w-72 rounded-full bg-blue-600/30 blur-3xl" />
        <div className="absolute bottom-0 right-10 h-96 w-96 rounded-full bg-cyan-500/20 blur-3xl" />
      </div>

      <div className="relative mx-auto flex min-h-[calc(100vh-2rem)] max-w-6xl items-center justify-center">
        <div className="grid w-full overflow-hidden rounded-3xl bg-white shadow-2xl lg:grid-cols-[0.85fr_1.15fr]">
          <div className="hidden bg-gradient-to-br from-blue-700 to-indigo-900 p-10 text-white lg:block">
            <div className="text-3xl font-black">🏆 Quiz Master</div>
            <h1 className="mt-12 text-4xl font-black leading-tight">Create your student exam account</h1>
            <p className="mt-5 text-blue-100">
              Sign up using registration number and password, then access quizzes, secure exam timer, results, leaderboard and performance history.
            </p>
            <div className="mt-10 space-y-4">
              {[
                'JWT based secure authentication',
                'Registration number based student identity',
                'Automatic result and rank calculation',
                'Tab-switch activity tracking during exams',
              ].map((item) => (
                <div key={item} className="flex items-center gap-3 rounded-2xl bg-white/10 p-4 backdrop-blur">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-400 text-sm font-black text-emerald-950">✓</span>
                  <span className="font-semibold">{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="p-6 sm:p-10">
            <div className="mb-8">
              <Link to="/login" className="text-sm font-bold text-blue-600 hover:underline">← Back to login</Link>
              <h2 className="mt-4 text-3xl font-black tracking-tight">Student Registration</h2>
              <p className="mt-2 text-sm text-slate-500">Use your registration number and password to create your student account.</p>
            </div>

            <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-bold text-slate-700">Full Name *</label>
                <input
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="Enter full name"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">Registration No *</label>
                <input
                  name="registrationNo"
                  value={form.registrationNo}
                  onChange={handleChange}
                  placeholder="e.g. 2101289036"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 uppercase outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">Email (Optional)</label>
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="student@example.com (optional)"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">Branch</label>
                <select
                  name="branch"
                  value={form.branch}
                  onChange={handleChange}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
                >
                  {['CSE', 'IT', 'ECE', 'EEE', 'ME', 'CE', 'Other'].map((branch) => <option key={branch}>{branch}</option>)}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">Semester</label>
                <select
                  name="semester"
                  value={form.semester}
                  onChange={handleChange}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
                >
                  {['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th'].map((semester) => <option key={semester}>{semester}</option>)}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">Password *</label>
                <input
                  type="password"
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  placeholder="Minimum 6 characters"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">Confirm Password *</label>
                <input
                  type="password"
                  name="confirmPassword"
                  value={form.confirmPassword}
                  onChange={handleChange}
                  placeholder="Re-enter password"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
                />
              </div>

              <button
                disabled={loading}
                className="mt-2 rounded-2xl bg-blue-600 py-3.5 font-black text-white shadow-lg shadow-blue-600/25 transition hover:-translate-y-0.5 hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60 md:col-span-2"
              >
                {loading ? 'Creating account...' : 'Create Student Account'}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-slate-500">
              Already registered?{' '}
              <Link to="/login" className="font-black text-blue-600 hover:underline">Sign in</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
