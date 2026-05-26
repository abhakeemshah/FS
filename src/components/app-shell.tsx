import type { ReactNode } from 'react';
import { BUSINESS_PROFILE } from '../lib/business-profile';

const railItems = [
  { label: 'Home', short: 'H' },
  { label: 'Overview', short: 'O' },
  { label: 'Grid', short: 'G' },
  { label: 'Reports', short: 'R' },
  { label: 'Chat', short: 'C' },
  { label: 'More', short: '...' },
];

export function AppShell({ children, activeIndex = 1 }: { children: ReactNode; activeIndex?: number }) {
  return (
    <div className="app-shell">
      <div className="page-shell">
        <header className="topbar">
          <div className="brand">
            <span className="brand-mark">F</span>
            <span>{BUSINESS_PROFILE.shopName}</span>
          </div>

          <div className="searchbar" aria-label="Search field">
            <span>⌕</span>
            <span>Search invoices, customers, or reports</span>
            <span>
              ⌘ <strong>F</strong>
            </span>
          </div>

          <div className="profile-chip">
            <div className="profile-avatar">M</div>
            <div className="profile-copy">
              <strong>Ops Desk</strong>
              <span>Admin console</span>
            </div>
          </div>
        </header>

        <div className="content-grid">
          <aside className="side-rail" aria-label="Primary navigation">
            <nav>
              {railItems.map((item, index) => (
                <button className={index === activeIndex ? 'rail-btn active' : 'rail-btn'} key={item.label} type="button" aria-label={item.label}>
                  {item.short}
                </button>
              ))}
            </nav>
          </aside>

          <div>{children}</div>
        </div>
      </div>
    </div>
  );
}
