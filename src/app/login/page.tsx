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

      <main className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-gradient-to-br from-slate-50 via-white to-slate-50">
        <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-indigo-600/5 rounded-full blur-[100px]" />
        <div className="absolute bottom-[-10%] left-[-5%] w-[400px] h-[400px] bg-indigo-600/3 rounded-full blur-[80px]" />

        <div className="w-full max-w-2xl relative mt-14">
          <div className="bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200/50 backdrop-blur-2xl">
            {/* Header Section */}
            <div className="px-8 pt-10 pb-6 text-center border-b border-slate-100">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br from-indigo-600 to-indigo-700 mb-4 shadow-md shadow-indigo-600/20">
                <span className="material-symbols-outlined text-white text-lg">security</span>
              </div>
              <h1 className="text-3xl font-semibold text-slate-900 tracking-tight mb-2">Welcome Back</h1>
              <p className="text-sm text-slate-600">Select your role to continue</p>
            </div>

            {/* Role Selection Section */}
            <div className="px-8 py-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Admin Option */}
                <Link href="/login/admin" className="group">
                  <div className="relative p-6 rounded-xl bg-gradient-to-br from-indigo-50 to-indigo-100/50 border-2 border-indigo-200 hover:border-indigo-400 transition-all duration-300 hover:shadow-md hover:shadow-indigo-200/30 cursor-pointer h-full flex flex-col items-center justify-center">
                    <div className="mb-3 p-3 rounded-full bg-indigo-600/10 group-hover:bg-indigo-600/20 transition-colors">
                      <span className="material-symbols-outlined text-indigo-700 text-3xl">admin_panel_settings</span>
                    </div>
                    <h3 className="text-lg font-semibold text-indigo-900 mb-1">Admin Portal</h3>
                    <p className="text-sm text-indigo-700 text-center">Manage products, categories, and settings</p>
                  </div>
                </Link>

                {/* Staff Option */}
                <Link href="/login/staff" className="group">
                  <div className="relative p-6 rounded-xl bg-gradient-to-br from-emerald-50 to-emerald-100/50 border-2 border-emerald-200 hover:border-emerald-400 transition-all duration-300 hover:shadow-md hover:shadow-emerald-200/30 cursor-pointer h-full flex flex-col items-center justify-center">
                    <div className="mb-3 p-3 rounded-full bg-emerald-600/10 group-hover:bg-emerald-600/20 transition-colors">
                      <span className="material-symbols-outlined text-emerald-700 text-3xl">badge</span>
                    </div>
                    <h3 className="text-lg font-semibold text-emerald-900 mb-1">Staff Portal</h3>
                    <p className="text-sm text-emerald-700 text-center">Access your dashboard and reports</p>
                  </div>
                </Link>
              </div>

              {/* Info Box */}
              <div className="mt-8 p-4 rounded-lg bg-slate-50 border border-slate-200">
                <p className="text-sm text-slate-600 text-center">
                  <span className="font-semibold text-slate-700">Test Credentials:</span>
                  <br />
                  Admin: admin@fscomms.io / admin123
                  <br />
                  Staff: staff@fscomms.io / staff123
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
