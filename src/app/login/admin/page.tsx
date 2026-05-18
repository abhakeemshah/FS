'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { authenticateAdmin, saveAdminSession } from '../../../lib/staff-auth';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('admin@fscomms.io');
  const [password, setPassword] = useState('admin123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Use local storage based authentication
      if (authenticateAdmin(email, password)) {
        saveAdminSession();
        router.push('/login/admin/dashboard');
      } else {
        setError('Invalid email or password');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <header className="bg-white/70 backdrop-blur-xl fixed top-0 w-full z-50 shadow-xl shadow-indigo-900/5">
        <div className="flex justify-between items-center px-6 py-4 w-full max-w-7xl mx-auto">
          <Link href="/login" className="text-lg font-extrabold text-indigo-900 tracking-tight font-['Manrope'] hover:opacity-80 transition-opacity">
            FS Communication
          </Link>
          <div className="flex items-center gap-4">
            <span className="text-sm font-semibold text-indigo-600 bg-indigo-100 px-3 py-1 rounded-full">Admin Portal</span>
            <Link href="/login" className="text-sm text-slate-600 hover:text-indigo-700 transition-colors font-['Manrope'] font-bold">
              Back
            </Link>
          </div>
        </div>
      </header>

      <main className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-gradient-to-br from-slate-50 via-white to-slate-50">
        <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-indigo-600/5 rounded-full blur-[100px]" />
        <div className="absolute bottom-[-10%] left-[-5%] w-[400px] h-[400px] bg-indigo-600/3 rounded-full blur-[80px]" />

        <div className="w-full max-w-sm relative mt-14">
          <div className="bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200/50 backdrop-blur-2xl">
            {/* Header Section */}
            <div className="px-8 pt-8 pb-6 text-center border-b border-slate-100 bg-gradient-to-b from-indigo-50 to-white">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br from-indigo-600 to-indigo-700 mb-4 shadow-md shadow-indigo-600/20">
                <span className="material-symbols-outlined text-white text-lg">admin_panel_settings</span>
              </div>
              <h1 className="text-2xl font-semibold text-slate-900 tracking-tight mb-1">Admin Login</h1>
              <p className="text-sm text-slate-600">Enter your credentials to access the dashboard</p>
            </div>

            {/* Form Section */}
            <form onSubmit={handleSubmit} className="px-8 py-8 space-y-4">
              {/* Email Field */}
              <div className="space-y-3">
                <label className="text-sm font-semibold text-slate-700 uppercase tracking-wide flex items-center gap-2">
                  <span className="material-symbols-outlined text-base">alternate_email</span>
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@fscomms.io"
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 border-2 border-slate-200 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-100 transition-all outline-none text-sm font-medium"
                  required
                />
              </div>

              {/* Password Field */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-semibold text-slate-700 uppercase tracking-wide flex items-center gap-2">
                    <span className="material-symbols-outlined text-base">lock</span>
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 transition-colors"
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••"
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 border-2 border-slate-200 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-100 transition-all outline-none text-sm font-medium"
                    required
                  />
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="p-4 rounded-lg bg-red-50 border border-red-200 flex items-start gap-3">
                  <span className="material-symbols-outlined text-red-600 text-xl flex-shrink-0">error</span>
                  <p className="text-sm text-red-700 font-medium">{error}</p>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2 rounded-lg bg-gradient-to-r from-indigo-600 to-indigo-700 text-white font-semibold text-sm shadow-md shadow-indigo-600/20 hover:shadow-lg hover:shadow-indigo-600/30 active:scale-[0.995] disabled:opacity-70 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-lg">{loading ? 'schedule' : 'login'}</span>
                {loading ? 'Signing In...' : 'Sign In as Admin'}
              </button>

              {/* Support Text */}
              <p className="text-center text-xs text-slate-600 pt-2">
                Only authorized administrators can access this portal.{' '}
                <Link href="/login" className="text-indigo-600 font-semibold hover:underline">
                  Go back
                </Link>
              </p>
            </form>

            {/* Footer */}
            <div className="px-10 py-6 bg-slate-50 border-t border-slate-100 text-center">
              <p className="text-xs text-slate-600">
                <span className="font-semibold">Demo Credentials:</span> admin@fscomms.io / admin123
              </p>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
