"use client";

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { readStaffSession, hasAdminSession, STAFF_AUTH_EVENT } from '../lib/staff-auth';
import { clearAdminSession, clearStaffSession, markAdminSessionActive } from '../lib/staff-auth';

type AdminSection = 'dashboard' | 'sales' | 'products' | 'purchases' | 'payments' | 'parties' | 'reports' | 'settings' | 'staff';

type WorkspaceMode = 'admin' | 'staff';

const WorkspaceModeContext = createContext<WorkspaceMode>('admin');

export function WorkspaceModeProvider({ mode, children }: { mode: WorkspaceMode; children: ReactNode }) {
  return <WorkspaceModeContext.Provider value={mode}>{children}</WorkspaceModeContext.Provider>;
}

export function useWorkspaceMode() {
  return useContext(WorkspaceModeContext);
}

const adminNavItems: Array<{ key: AdminSection; label: string; icon: string; href: string }> = [
  { key: 'dashboard', label: 'Dashboard', icon: 'dashboard', href: '/access/admin/dashboard' },
  { key: 'sales', label: 'Sales', icon: 'payments', href: '/access/admin/sales/invoices' },
  { key: 'products', label: 'Products', icon: 'inventory_2', href: '/access/admin/products' },
  { key: 'purchases', label: 'Purchases', icon: 'shopping_cart', href: '/access/admin/purchases' },
  { key: 'payments', label: 'Payments', icon: 'account_balance_wallet', href: '/access/admin/payments' },
  { key: 'reports', label: 'Reports', icon: 'analytics', href: '/access/admin/reports' },
  { key: 'settings', label: 'Settings', icon: 'settings', href: '/access/admin/settings' },
];

const staffNavItems: Array<{ key: AdminSection; label: string; icon: string; href: string }> = [
  { key: 'dashboard', label: 'Dashboard', icon: 'dashboard', href: '/access/staff/dashboard' },
  { key: 'sales', label: 'Sales', icon: 'payments', href: '/access/staff/sales' },
  { key: 'products', label: 'Products', icon: 'inventory_2', href: '/access/staff/products' },
  { key: 'purchases', label: 'Purchases', icon: 'shopping_cart', href: '/access/staff/purchases' },
  { key: 'payments', label: 'Payments', icon: 'account_balance_wallet', href: '/access/staff/payments' },
  { key: 'reports', label: 'Reports', icon: 'analytics', href: '/access/staff/reports' },
];

const adminPartyNavItems = [
  { key: 'customers', label: 'Customers', href: '/access/admin/parties/customers' },
  { key: 'suppliers', label: 'Suppliers', href: '/access/admin/parties/suppliers' },
];

const staffPartyNavItems = [
  { key: 'customers', label: 'Customers', href: '/access/staff/parties/customers' },
  { key: 'suppliers', label: 'Suppliers', href: '/access/staff/parties/suppliers' },
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
  const mode = useContext(WorkspaceModeContext);
  const [isCollapsed, setIsCollapsed] = useState(sidebarCollapsedPreference ?? false);
  const [isReady, setIsReady] = useState(sidebarCollapsedPreference !== null);
  const [isPartiesMenuOpen, setIsPartiesMenuOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [adminName, setAdminName] = useState('Admin User');
  const [isAdminActive, setIsAdminActive] = useState(false);
  const navItems = mode === 'staff' ? staffNavItems : adminNavItems;
  const partyNavItems = mode === 'staff' ? staffPartyNavItems : adminPartyNavItems;
  const sidebarTitle = mode === 'staff' ? 'Staff Panel' : 'Admin Panel';
  const sidebarSubtitle = mode === 'staff' ? 'Operational workspace' : 'Precision Curator Control';
  const roleLabel = mode === 'staff' ? 'Staff Member' : 'Administrator';

  const handleLogout = () => {
    if (mode === 'staff') {
      clearStaffSession();
      router.push('/access');
      return;
    }

    clearAdminSession();
    window.localStorage.removeItem('admin-sidebar-collapsed');
    router.push('/access');
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
    const partiesPathPrefix = mode === 'staff' ? '/access/staff/parties' : '/access/admin/parties';
    setIsPartiesMenuOpen(Boolean(pathname?.startsWith(partiesPathPrefix)));
  }, [pathname, mode]);

  useEffect(() => {
    if (activateSession && mode === 'admin') {
      markAdminSessionActive();
    }
  }, [activateSession, mode]);

  // Track admin-session presence on the client to avoid reading localStorage during render
  useEffect(() => {
    const updateAdmin = () => setIsAdminActive(hasAdminSession());
    updateAdmin();
    window.addEventListener('storage', updateAdmin);
    window.addEventListener(STAFF_AUTH_EVENT, updateAdmin as EventListener);
    return () => {
      window.removeEventListener('storage', updateAdmin);
      window.removeEventListener(STAFF_AUTH_EVENT, updateAdmin as EventListener);
    };
  }, []);

  // Prevent staff users from directly accessing admin routes (client-only guard)
  useEffect(() => {
    const check = () => {
      const staff = readStaffSession();
      // If a staff session exists but no admin session is active,
      // navigate away to the login page (logic-only guard).
      if (mode !== 'staff' && staff && !hasAdminSession()) {
        router.push('/access');
      }
    };

    check();
    window.addEventListener('storage', check);
    window.addEventListener(STAFF_AUTH_EVENT, check as EventListener);

    return () => {
      window.removeEventListener('storage', check);
      window.removeEventListener(STAFF_AUTH_EVENT, check as EventListener);
    };
  }, [router]);

  const collapsed = isReady ? isCollapsed : false;
  const sidebarIconClassName = `material-symbols-outlined flex h-5 w-5 items-center justify-center rounded-md bg-slate-100/80 text-[12px] leading-none text-slate-500 transition-colors group-hover:bg-blue-50 group-hover:text-blue-600 group-active:bg-blue-100 group-active:text-blue-700`;

  return (
    <AdminShellContext.Provider value={{ isCollapsed }}>
      <div className="flex min-h-screen flex-col bg-slate-50 lg:flex-row">
      <aside
        className={`fixed left-0 top-0 z-20 flex h-screen flex-col border-r border-slate-200 bg-white p-3 text-xs shadow-[0_6px_24px_rgba(15,23,42,0.06)] overflow-y-auto hide-scrollbar pb-6 ${
          isReady ? 'transition-[width] duration-150 ease-out' : ''
        } ${
          collapsed ? 'w-20' : 'w-56'
        }`}
      >
        <div className={`mb-6 rounded-lg border border-slate-200 bg-slate-50 ${collapsed ? 'px-2 py-2' : 'px-3 py-2'}`}>
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h2 className={`font-['Manrope'] font-black text-slate-900 tracking-tighter ${collapsed ? 'text-sm' : 'text-xl'}`}>
                {collapsed ? (mode === 'staff' ? 'SP' : 'AP') : sidebarTitle}
              </h2>
              {!collapsed ? (
                <p className="text-[10px] uppercase tracking-widest text-slate-500 mt-1">{sidebarSubtitle}</p>
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

          {mode === 'admin' && isAdminActive ? (
            <Link
              href="/access/admin/staff"
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
          ) : null}
        </nav>
      </aside>

      <main className={`flex min-h-screen min-w-0 flex-1 flex-col ${isReady ? 'transition-[margin-left] duration-150 ease-out' : ''} ${collapsed ? 'ml-20' : 'ml-56'}`}>
        <header className="sticky top-0 z-10 flex h-auto w-full flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-white px-3 py-2 sm:px-5 lg:h-10 lg:flex-nowrap lg:py-0">
          <div className="flex min-w-0 items-center gap-2">
            <span className="text-lg font-extrabold tracking-tight text-slate-900">{title}</span>
          </div>
          <div className="relative flex items-center gap-2">
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
                  <p className="text-xs text-slate-500">{roleLabel}</p>
                </div>
                <button
                  onClick={() => {
                    handleLogout();
                    setIsProfileMenuOpen(false);
                  }}
                  className="mx-3 my-3 inline-flex w-auto items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-3 py-1.5 text-[11px] font-semibold text-rose-700 shadow-sm transition-all hover:-translate-y-0.5 hover:border-rose-300 hover:bg-rose-100 hover:shadow active:translate-y-0 active:scale-95"
                  type="button"
                >
                  <span className="material-symbols-outlined text-[14px]">logout</span>
                  <span>Logout</span>
                </button>
              </div>
            )}
          </div>
        </header>

        <div className="mx-auto w-full max-w-[1500px] space-y-3 p-2 pt-2">{children}</div>
      </main>
      </div>
    </AdminShellContext.Provider>
  );
}
