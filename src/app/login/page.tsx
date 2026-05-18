'use client';

import Link from 'next/link';

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

      <main className="min-h-screen p-4 relative overflow-hidden bg-gradient-to-br from-slate-50 via-white to-slate-50">
        <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-indigo-600/5 rounded-full blur-[100px]" />
        <div className="absolute bottom-[-10%] left-[-5%] w-[400px] h-[400px] bg-indigo-600/3 rounded-full blur-[80px]" />

        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 items-center min-h-[70vh]">
          {/* Left visual panel */}
          <div className="flex items-center justify-center">
            <div className="w-full max-w-[44rem] h-[520px] rounded-2xl overflow-hidden shadow-2xl border border-slate-200/30 bg-gray-100">
              <div className="w-full h-full bg-cover bg-center" style={{ backgroundImage: `url('https://images.unsplash.com/photo-1560184897-6b7d7f0a6a57?q=80&w=1400&auto=format&fit=crop&ixlib=rb-4.0.3&s=')` }} />
              <div className="absolute bottom-6 left-6 text-white drop-shadow-lg">
                <h3 className="text-2xl font-semibold">Manage Properties Efficiently</h3>
                <p className="text-sm max-w-lg mt-2">Easily track invoices, purchases, and team communication in one place.</p>
              </div>
            </div>
          </div>

          {/* Right form panel */}
          <div className="flex items-center justify-center">
            <div className="w-full max-w-md">
              <div className="bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200/50 backdrop-blur-2xl p-6">
                <div className="text-center mb-4">
                  <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-indigo-600 to-indigo-700 mb-3 shadow-sm mx-auto">
                    <span className="material-symbols-outlined text-white text-base">security</span>
                  </div>
                  <h1 className="text-2xl font-semibold text-slate-900 tracking-tight mb-1">Welcome Back</h1>
                  <p className="text-xs text-slate-600">Select your role to continue</p>
                </div>

                <div className="space-y-4">
                  <Link href="/login/admin" className="block">
                    <div className="w-full rounded-full px-5 py-3 bg-indigo-50 text-indigo-900 font-semibold border border-indigo-200 hover:bg-indigo-100 transition">Admin Portal</div>
                  </Link>
                  <Link href="/login/staff" className="block">
                    <div className="w-full rounded-full px-5 py-3 bg-emerald-50 text-emerald-900 font-semibold border border-emerald-200 hover:bg-emerald-100 transition">Staff Portal</div>
                  </Link>

                  <div className="mt-3 p-3 rounded-lg bg-slate-50 border border-slate-200 text-center text-xs text-slate-600">
                    <span className="font-semibold text-slate-700">Test Credentials:</span>
                    <div className="mt-1">Admin: admin@fscomms.io / admin123</div>
                    <div>Staff: staff@fscomms.io / staff123</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
