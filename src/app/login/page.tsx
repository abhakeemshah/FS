'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { authenticateAdmin, saveAdminSession, authenticateStaff, saveStaffSession } from '../../lib/staff-auth';

export default function LoginPage() {
  return (
    <>
      <header className="bg-white/70 backdrop-blur-xl fixed top-0 w-full z-50 shadow-xl shadow-indigo-900/5">
        <div className="flex justify-between items-center px-6 py-4 w-full max-w-7xl mx-auto">
          <div className="text-lg font-extrabold text-indigo-900 tracking-tight font-['Manrope']">FS Communication</div>
          <div className="hidden md:flex gap-6 text-sm">
            <Link className="text-indigo-900 border-b-2 border-indigo-700 pb-1 font-['Manrope'] font-bold tracking-tight" href="/">
              Home
            </Link>
            <a className="text-slate-600 hover:text-indigo-700 transition-colors font-['Manrope'] font-bold tracking-tight" href="#">
              Products
            </a>
            <a className="text-slate-600 hover:text-indigo-700 transition-colors font-['Manrope'] font-bold tracking-tight" href="#">
              Support
            </a>
          </div>
        </div>
      </header>

      <main className="h-[100svh] pt-20 p-4 relative overflow-hidden bg-gradient-to-br from-slate-50 via-white to-slate-50">
        <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-indigo-600/5 rounded-full blur-[100px]" />
        <div className="absolute bottom-[-10%] left-[-5%] w-[400px] h-[400px] bg-indigo-600/3 rounded-full blur-[80px]" />

        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-[65fr_35fr] gap-6 items-center h-[calc(100svh-6rem)] max-h-[calc(100svh-6rem)]">
          {/* Left visual panel */}
          <div className="hidden md:flex items-center justify-center h-full">
            <div className="w-full h-[98%] rounded-2xl overflow-hidden shadow-2xl border border-slate-200/30 bg-gray-100 relative">
              <div className="w-full h-full bg-cover bg-center" style={{ backgroundImage: `url('https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=1400&q=80')` }} />
              <div className="absolute bottom-6 left-6 text-white drop-shadow-lg" />
            </div>
          </div>

          {/* Right form panel */}
          <div className="flex items-center justify-center h-full">
            <div className="w-full max-w-[28rem]">
              <div className="bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200/50 backdrop-blur-2xl p-5 max-h-[calc(100svh-7rem)] overflow-hidden">
                <RightPanel />
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}

function RightPanel() {
  const [role, setRole] = useState<'admin' | 'staff'>('admin');
  const [email, setEmail] = useState('admin@fscomms.io');
  const [password, setPassword] = useState('admin123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const selectRole = (r: 'admin' | 'staff') => {
    setError('');
    setRole(r);
    if (r === 'admin') {
      setEmail('admin@fscomms.io');
      setPassword('admin123');
    } else {
      setEmail('staff@fscomms.io');
      setPassword('staff123');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      if (role === 'admin') {
        if (authenticateAdmin(email, password)) {
          saveAdminSession();
          router.push('/login/admin/dashboard');
        } else {
          setError('Invalid admin credentials');
        }
      } else if (role === 'staff') {
        const account = authenticateStaff(email, password);
        if (account) {
          saveStaffSession({ id: account.id, name: account.name, username: account.username });
          router.push('/login/staff/dashboard');
        } else {
          setError('Invalid staff credentials');
        }
      }
    } catch (err) {
      console.error(err);
      setError('An error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="text-center mb-4">
        <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-indigo-600 to-indigo-700 mb-3 shadow-sm mx-auto">
          <span className="material-symbols-outlined text-white text-base">security</span>
        </div>
        <h1 className="text-2xl font-semibold text-slate-900 tracking-tight mb-1">Welcome Back</h1>
        <p className="text-xs text-slate-600">Login is ready below. Switch role only if needed.</p>
      </div>

      <div className="space-y-3">
        <div className="flex gap-3">
          <button type="button" onClick={() => selectRole('admin')} className={`flex-1 rounded-full px-4 py-2 ${role === 'admin' ? 'bg-indigo-600 text-white' : 'bg-indigo-50 text-indigo-900'} border ${role === 'admin' ? 'border-indigo-600' : 'border-indigo-200'} font-semibold`}>Admin</button>
          <button type="button" onClick={() => selectRole('staff')} className={`flex-1 rounded-full px-4 py-2 ${role === 'staff' ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-900'} border ${role === 'staff' ? 'border-emerald-600' : 'border-emerald-200'} font-semibold`}>Staff</button>
        </div>

        <form onSubmit={handleSubmit} className="mt-3 space-y-3">
          <div>
            <label className="text-xs text-slate-700">Email</label>
            <input value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-4 py-2 rounded-full border border-slate-200 bg-slate-50 outline-none text-sm" />
          </div>
          <div>
            <label className="text-xs text-slate-700">Password</label>
            <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" className="w-full px-4 py-2 rounded-full border border-slate-200 bg-slate-50 outline-none text-sm" />
          </div>

          {error && <div className="text-sm text-red-700">{error}</div>}

          <button type="submit" disabled={loading} className={`w-full rounded-full py-3 ${role === 'admin' ? 'bg-gradient-to-r from-indigo-600 to-indigo-700' : 'bg-gradient-to-r from-emerald-600 to-emerald-700'} text-white font-semibold`}>
            {loading ? 'Signing In...' : `Sign in as ${role === 'admin' ? 'Admin' : 'Staff'}`}
          </button>
        </form>

      </div>
    </div>
  );
}
