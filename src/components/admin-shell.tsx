'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { markAdminSessionActive } from '../lib/staff-auth';

type AdminSection = 'dashboard' | 'sales' | 'products' | 'purchases' | 'payments' | 'parties' | 'reports' | 'settings' | 'staff';

const navItems: Array<{ key: AdminSection; label: string; icon: string; href: string }> = [
  { key: 'dashboard', label: 'Dashboard', icon: 'dashboard', href: '/login/admin/dashboard' },
  { key: 'sales', label: 'Sales', icon: 'payments', href: '/login/admin/sales/invoices' },
  { key: 'products', label: 'Products', icon: 'inventory_2', href: '/login/admin/products' },
  { key: 'purchases', label: 'Purchases', icon: 'shopping_cart', href: '/login/admin/purchases' },
  { key: 'payments', label: 'Payments', icon: 'account_balance_wallet', href: '/login/admin/payments' },
  { key: 'reports', label: 'Reports', icon: 'analytics', href: '/login/admin/reports' },
];

const partyNavItems = [
  { key: 'customers', label: 'Customers', href: '/login/admin/parties/customers' },
  { key: 'suppliers', label: 'Suppliers', href: '/login/admin/parties/suppliers' },
];

type AdminShellContextValue = {
  isCollapsed: boolean;
};

const AdminShellContext = createContext<AdminShellContextValue | null>(null);
let sidebarCollapsedPreference: boolean | null = null;

export function useAdminShellLayout() {
  const context = useContext(AdminShellContext);

  if (!context) {
    return { isCollapsed: false };
  }

  return context;
}

export function AdminShell({
  children,
  active,
  title,
  activateSession = true,
}: {
  children: ReactNode;
  active: AdminSection;
  title: string;
  activateSession?: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [isCollapsed, setIsCollapsed] = useState(sidebarCollapsedPreference ?? false);
  const [isReady, setIsReady] = useState(sidebarCollapsedPreference !== null);
  const [isPartiesMenuOpen, setIsPartiesMenuOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [adminName, setAdminName] = useState('Admin User');

  const handleLogout = () => {
    // Clear admin session
    window.localStorage.removeItem('admin-session-active');
    window.localStorage.removeItem('admin-sidebar-collapsed');
    // Redirect to login
    router.push('/login/admin');
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      const profileButton = target.closest('[data-profile-button]');
      const profileMenu = target.closest('[data-profile-menu]');
      
      if (!profileButton && !profileMenu && isProfileMenuOpen) {
        setIsProfileMenuOpen(false);
      }
    };

    if (isProfileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isProfileMenuOpen]);

  useEffect(() => {
    if (sidebarCollapsedPreference !== null) {
      setIsCollapsed(sidebarCollapsedPreference);
      setIsReady(true);
      return;
    }

    const savedValue = window.localStorage.getItem('admin-sidebar-collapsed');
    sidebarCollapsedPreference = savedValue === 'true';
    setIsCollapsed(sidebarCollapsedPreference);
    setIsReady(true);
  }, []);

  useEffect(() => {
    if (!isReady) return;
    sidebarCollapsedPreference = isCollapsed;
    window.localStorage.setItem('admin-sidebar-collapsed', String(isCollapsed));
  }, [isCollapsed, isReady]);

  useEffect(() => {
    setIsPartiesMenuOpen(Boolean(pathname?.startsWith('/login/admin/parties')));
  }, [pathname]);

  useEffect(() => {
    if (activateSession) {
      markAdminSessionActive();
    }
  }, [activateSession]);

  const collapsed = isReady ? isCollapsed : false;
  const sidebarIconClassName = `material-symbols-outlined flex h-5 w-5 items-center justify-center rounded-md bg-slate-100/80 text-[12px] leading-none text-slate-500 transition-colors group-hover:bg-blue-50 group-hover:text-blue-600 group-active:bg-blue-100 group-active:text-blue-700`;

  return (
    <AdminShellContext.Provider value={{ isCollapsed }}>
      <div className="flex min-h-screen bg-slate-50">
      <aside
        className={`h-screen fixed left-0 top-0 bg-white flex flex-col border-r border-slate-200 p-3 text-xs shadow-[0_6px_24px_rgba(15,23,42,0.06)] ${
          isReady ? 'transition-[width] duration-150 ease-out' : ''
        } ${
          collapsed ? 'w-20' : 'w-56'
        }`}
      >
        <div className={`mb-6 rounded-lg border border-slate-200 bg-slate-50 ${collapsed ? 'px-2 py-2' : 'px-3 py-2'}`}>
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h2 className={`font-['Manrope'] font-black text-slate-900 tracking-tighter ${collapsed ? 'text-sm' : 'text-xl'}`}>
                {collapsed ? 'AP' : 'Admin Panel'}
              </h2>
              {!collapsed ? (
                <p className="text-[10px] uppercase tracking-widest text-slate-500 mt-1">Precision Curator Control</p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => setIsCollapsed((current) => !current)}
              className="group shrink-0 rounded-md border border-slate-200 bg-white p-1 text-slate-500 opacity-85 transition-all hover:bg-slate-100 hover:opacity-100"
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              <span className="material-symbols-outlined flex h-4 w-4 items-center justify-center text-[13px] leading-none opacity-75 transition-colors group-hover:text-slate-700">
                {collapsed ? 'menu' : 'menu_open'}
              </span>
            </button>
          </div>
        </div>

        <nav className="flex-1 space-y-1" aria-label="Admin Sidebar">
          {navItems.map((item) => {
            const isActive = item.key === active;
            const linkClassName = isActive
              ? `group rounded-lg border border-blue-200 bg-blue-50 py-2 mb-1.5 flex items-center font-bold text-blue-800 shadow-sm transition-all duration-200 hover:scale-[1.01] active:scale-[0.98] ${
                  collapsed ? 'px-2 justify-center gap-0' : 'px-3 gap-2.5'
                }`
              : `group rounded-lg border border-transparent py-2 mb-1.5 flex items-center text-slate-500 transition-all duration-200 hover:scale-[1.01] hover:border-blue-100 hover:bg-white hover:text-blue-600 hover:shadow-md active:scale-[0.98] ${
                  collapsed ? 'px-2 justify-center gap-0' : 'px-3 gap-2.5'
                }`;

            return (
              <Link
                key={item.key}
                href={item.href}
                title={collapsed ? item.label : undefined}
                className={linkClassName}
              >
                <span className={sidebarIconClassName}>{item.icon}</span>
                {!collapsed ? <span>{item.label}</span> : null}
              </Link>
            );
          })}

          <div>
            {(() => {
              const partiesClassName =
                isPartiesMenuOpen || active === 'parties'
                  ? `group w-full py-2 mb-1.5 flex items-center rounded-lg transition-all duration-200 bg-blue-50 text-blue-800 shadow-sm border border-blue-200 font-bold hover:scale-[1.01] active:scale-[0.98] ${
                      collapsed ? 'px-2 justify-center gap-0' : 'px-3 gap-2.5'
                    }`
                  : `group w-full py-2 mb-1.5 flex items-center rounded-lg transition-all duration-200 border border-transparent text-slate-500 hover:bg-white hover:text-blue-600 hover:border hover:border-blue-100 hover:shadow-md hover:scale-[1.01] active:scale-[0.98] ${
                      collapsed ? 'px-2 justify-center gap-0' : 'px-3 gap-2.5'
                    }`;

              return (
            <button
              type="button"
              onClick={() => setIsPartiesMenuOpen((current) => !current)}
              title={collapsed ? 'Parties' : undefined}
              className={partiesClassName}
              aria-expanded={isPartiesMenuOpen}
            >
              <span className={sidebarIconClassName}>groups</span>
              {!collapsed ? <span className="flex-1 text-left">Parties</span> : null}
              {!collapsed ? (
                <span className="material-symbols-outlined text-[12px] text-slate-400 transition-colors group-hover:text-slate-600">{isPartiesMenuOpen ? 'expand_less' : 'expand_more'}</span>
              ) : null}
            </button>
              );
            })()}
          </div>

          {!collapsed && isPartiesMenuOpen ? (
            <div className="ml-4 space-y-1 border-l border-slate-200 pl-2">
              {partyNavItems.map((item) => {
                const isActive = pathname === item.href;

                return (
                  <Link
                    key={item.key}
                    href={item.href}
                    className={`block rounded-lg border px-3 py-2 text-xs font-semibold transition-all duration-200 ${
                      isActive
                        ? 'border-rose-200 bg-rose-50 text-rose-700 shadow-sm'
                        : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-700'
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>
          ) : null}

          <Link
            href="/login/admin/settings"
            title={collapsed ? 'Settings' : undefined}
            className={`group ${
              active === 'settings'
                ? `rounded-lg border border-blue-200 bg-blue-50 py-2 mb-1.5 flex items-center font-bold text-blue-800 shadow-sm transition-all duration-200 hover:scale-[1.01] active:scale-[0.98] ${
                    collapsed ? 'px-2 justify-center gap-0' : 'px-3 gap-2.5'
                  }`
                : `rounded-lg border border-transparent py-2 mb-1.5 flex items-center text-slate-500 transition-all duration-200 hover:scale-[1.01] hover:border-blue-100 hover:bg-white hover:text-blue-600 hover:shadow-md active:scale-[0.98] ${
                    collapsed ? 'px-2 justify-center gap-0' : 'px-3 gap-2.5'
                  }`
            }`}
          >
            <span className={sidebarIconClassName}>settings</span>
            {!collapsed ? <span>Settings</span> : null}
          </Link>

          <Link
            href="/login/admin/staff"
            title={collapsed ? 'Staff' : undefined}
            className={`group ${
              active === 'staff'
                ? `rounded-lg border border-blue-200 bg-blue-50 py-2 mb-1.5 flex items-center font-bold text-blue-800 shadow-sm transition-all duration-200 hover:scale-[1.01] active:scale-[0.98] ${
                    collapsed ? 'px-2 justify-center gap-0' : 'px-3 gap-2.5'
                  }`
                : `rounded-lg border border-transparent py-2 mb-1.5 flex items-center text-slate-500 transition-all duration-200 hover:scale-[1.01] hover:border-blue-100 hover:bg-white hover:text-blue-600 hover:shadow-md active:scale-[0.98] ${
                    collapsed ? 'px-2 justify-center gap-0' : 'px-3 gap-2.5'
                  }`
            }`}
          >
            <span className={sidebarIconClassName}>badge</span>
            {!collapsed ? <span>Staff</span> : null}
          </Link>
        </nav>
      </aside>

      <main className={`flex-1 flex flex-col min-h-screen ${isReady ? 'transition-[margin-left] duration-150 ease-out' : ''} ${collapsed ? 'ml-20' : 'ml-56'}`}>
        <header className="top-0 sticky z-10 bg-white flex justify-between items-center px-5 py-0 w-full border-b border-slate-200 h-10">
          <div className="flex items-center gap-2">
            <span className="text-lg font-extrabold tracking-tight text-slate-900">{title}</span>
          </div>
          <div className="flex items-center gap-2 relative">
            <button 
              className="hover:bg-blue-50 rounded-full p-1.5 border border-slate-200 transition-all duration-150"
              type="button"
              title="Help"
              onClick={() => alert('Help & Support - Contact admin@fscommunication.com')}
            >
              <span className="material-symbols-outlined text-[18px] text-slate-600">help</span>
            </button>
            
            <button
              onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
              className="ml-2 hover:bg-blue-50 rounded-full p-1.5 border border-slate-200 transition-all duration-150 relative"
              type="button"
              data-profile-button
            >
              <span className="material-symbols-outlined text-[20px] text-slate-600">account_circle</span>
            </button>

            {isProfileMenuOpen && (
              <div className="absolute top-12 right-0 w-48 bg-white border border-slate-200 rounded-lg shadow-lg z-50" data-profile-menu>
                <div className="px-4 py-3 border-b border-slate-100">
                  <p className="text-xs text-slate-500 uppercase tracking-wide font-semibold">Account</p>
                  <p className="text-sm font-bold text-slate-900 mt-1">{adminName}</p>
                  <p className="text-xs text-slate-500">Administrator</p>
                </div>
                <button
                  onClick={() => {
                    handleLogout();
                    setIsProfileMenuOpen(false);
                  }}
                  className="w-full px-4 py-2.5 text-left text-sm font-semibold text-red-700 hover:bg-red-50 transition-colors flex items-center gap-2 border-t border-slate-100"
                  type="button"
                >
                  <span className="material-symbols-outlined text-[16px]">logout</span>
                  <span>Logout</span>
                </button>
              </div>
            )}
          </div>
        </header>

        <div className="p-2 pt-2 space-y-3 max-w-[1500px] mx-auto w-full">{children}</div>
      </main>
      </div>
    </AdminShellContext.Provider>
  );
}
