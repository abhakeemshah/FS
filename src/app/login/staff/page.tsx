'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { readStaffSession, saveStaffSession, authenticateStaff } from '../../../lib/staff-auth';

export default function StaffLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('staff@fscomms.io');
  const [password, setPassword] = useState('staff123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (readStaffSession()) {
      router.replace('/login/staff/dashboard');
    }
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Use local storage based authentication
      const account = authenticateStaff(email, password);

      if (account) {
        saveStaffSession({
          id: account.id,
          name: account.name,
          username: account.username,
        });

        router.replace('/login/staff/dashboard');
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
      <header className="bg-white/70 backdrop-blur-xl fixed top-0 w-full z-50 shadow-xl shadow-emerald-900/5">
        <div className="flex justify-between items-center px-6 py-4 w-full max-w-7xl mx-auto">
          <Link href="/login" className="text-lg font-extrabold text-emerald-900 tracking-tight font-['Manrope'] hover:opacity-80 transition-opacity">
            FS Communication
          </Link>
          <div className="flex items-center gap-4">
            <span className="text-sm font-semibold text-emerald-600 bg-emerald-100 px-3 py-1 rounded-full">Staff Portal</span>
            <Link href="/login" className="text-sm text-slate-600 hover:text-emerald-700 transition-colors font-['Manrope'] font-bold">
              Back
            </Link>
          </div>
        </div>
      </header>

      <main className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-gradient-to-br from-slate-50 via-white to-slate-50">
        <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-emerald-600/5 rounded-full blur-[100px]" />
        <div className="absolute bottom-[-10%] left-[-5%] w-[400px] h-[400px] bg-emerald-600/3 rounded-full blur-[80px]" />

        <div className="w-full max-w-[20rem] relative mt-12">
          <div className="bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200/50 backdrop-blur-2xl p-6">
            {/* Header Section */}
            <div className="text-center mb-2">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br from-emerald-600 to-emerald-700 mb-2 shadow-sm mx-auto">
                <span className="material-symbols-outlined text-white text-base">badge</span>
              </div>
              <h1 className="text-xl font-semibold text-slate-900 tracking-tight mb-0">Staff Login</h1>
              <p className="text-xs text-slate-600">Access your dashboard and reports</p>
            </div>

            {/* Form Section */}
            <form onSubmit={handleSubmit} className="px-6 py-6 space-y-3">
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
                  placeholder="staff@fscomms.io"
                  className="w-full px-4 py-2 rounded-full bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-100 transition-all outline-none text-sm font-medium"
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
                    className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 transition-colors"
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
                    className="w-full px-4 py-2 rounded-full bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-100 transition-all outline-none text-sm font-medium"
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
                className="w-full py-3 rounded-full bg-gradient-to-r from-emerald-600 to-emerald-700 text-white font-semibold text-sm shadow-md shadow-emerald-600/20 hover:shadow-lg active:scale-[0.995] disabled:opacity-70 disabled:cursor-not-allowed transition-all duration-150 flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-lg">{loading ? 'schedule' : 'login'}</span>
                {loading ? 'Signing In...' : 'Sign In as Staff'}
              </button>

              {/* Support Text */}
              <p className="text-center text-xs text-slate-600 pt-2">
                Contact your administrator if you don't have an account.{' '}
                <Link href="/login" className="text-emerald-600 font-semibold hover:underline">
                  Go back
                </Link>
              </p>
            </form>

            {/* Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 text-center">
              <p className="text-xs text-slate-600">
                Use your assigned staff account to sign in.
              </p>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
