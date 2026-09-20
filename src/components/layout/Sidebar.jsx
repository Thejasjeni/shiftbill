import React from 'react';
import {
  LayoutDashboard,
  Users,
  Package,
  TrendingUp,
  ShoppingBag,
  FileBarChart,
  Settings,
  X,
  ChevronRight,
  HelpCircle
} from 'lucide-react';
import { useDashboard } from '../../context/DashboardContext';
import { NAVIGATION_ITEMS } from '../../data/mockData';
import { countLowStock } from '../../utils/stock';

const ICONS_MAP = {
  LayoutDashboard,
  Users,
  Package,
  TrendingUp,
  ShoppingBag,
  FileBarChart,
  Settings,
};

// Chrome on the deep brand surface: one white-opacity scale for text and
// dividers, so the bar reads as one piece rather than five shades of indigo.
const CHROME = {
  divider: 'border-white/10',
  label: 'text-micro font-bold uppercase tracking-wider text-white/45',
  idle: 'text-white/75 hover:bg-white/10 hover:text-white',
  active: 'bg-[var(--color-brand)] text-white shadow-e1 font-semibold'
};

export default function Sidebar() {
  const {
    isMobileDrawerOpen,
    setIsMobileDrawerOpen,
    activeNavTab,
    setActiveNavTab,
    businessInfo,
    currentData
  } = useDashboard();

  const getDynamicCount = (id) => {
    if (!currentData) return null;
    if (id === 'parties') return currentData.parties.length || null;
    // Items shows low/out-of-stock count (in amber) when there is any, else
    // the total count — the number a shopkeeper needs is the warning one.
    if (id === 'items') {
      const low = countLowStock(currentData.items);
      if (low > 0) return { value: low, tone: 'warn' };
      return currentData.items.length ? { value: currentData.items.length, tone: 'plain' } : null;
    }
    if (id === 'sale') return { value: currentData.transactions.filter(t => t.type === 'sale').length || null, tone: 'plain' };
    if (id === 'purchase') return { value: currentData.transactions.filter(t => t.type === 'purchase').length || null, tone: 'plain' };
    return null;
  };

  const handleNavClick = (id) => {
    setActiveNavTab(id);
    setIsMobileDrawerOpen(false);
  };

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isMobileDrawerOpen && (
        <div
          onClick={() => setIsMobileDrawerOpen(false)}
          className="fixed inset-0 z-40 bg-scrim backdrop-blur-xs lg:hidden"
          aria-hidden="true"
        />
      )}

      {/* Sidebar / Mobile Drawer Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 flex w-72 flex-col justify-between bg-[var(--color-brand-deep)] text-white/75 shadow-e3 transition-transform duration-300 ease-[var(--ease-quint)] lg:static lg:translate-x-0 lg:shadow-none ${
          isMobileDrawerOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Top Header / Profile Info */}
        <div>
          <div className={`flex items-center justify-between border-b p-4 ${CHROME.divider}`}>
            <div className="flex items-center gap-3">
              <img
                src="/logo.png"
                alt="SwiftBill Logo"
                className="h-10 w-10 rounded-[var(--radius-control)] object-contain ring-1 ring-white/20"
              />
              <div className="flex flex-col overflow-hidden text-left">
                <span className="truncate text-title font-bold tracking-tight text-white">
                  {businessInfo.name}
                </span>
                {businessInfo.gstin && (
                  <span className="num text-micro text-white/50">GSTIN {businessInfo.gstin}</span>
                )}
              </div>
            </div>

            {/* Mobile Close Button */}
            <button
              onClick={() => setIsMobileDrawerOpen(false)}
              className="rounded-[var(--radius-control)] p-1.5 text-white/60 transition-colors hover:bg-white/10 hover:text-white active:bg-white/20 cursor-pointer lg:hidden"
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Main Navigation Links */}
          <nav className="mt-2 space-y-1 p-3 text-left">
            <div className={`px-3 py-1.5 ${CHROME.label}`}>
              Main menu
            </div>
            {NAVIGATION_ITEMS.map((item) => {
              const Icon = ICONS_MAP[item.icon] || LayoutDashboard;
              const isActive = activeNavTab === item.id;
              const count = getDynamicCount(item.id);
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  aria-current={isActive ? 'page' : undefined}
                  className={`group flex w-full items-center justify-between rounded-[var(--radius-control)] px-3.5 py-2.5 text-body transition-colors cursor-pointer ${
                    isActive ? CHROME.active : CHROME.idle
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className="h-5 w-5" />
                    <span>{item.label}</span>
                  </div>
                  {count && (
                    <span
                      className={`num rounded-full px-2 py-0.5 text-micro font-bold ${
                        count.tone === 'warn'
                          ? 'bg-[var(--color-warn)]/25 text-[var(--color-warn-bright)] ring-1 ring-[var(--color-warn)]/40'
                          : isActive
                            ? 'bg-white/20 text-white'
                            : 'bg-white/10 text-white/70'
                      }`}
                    >
                      {count.value}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Utility / Open Source Community Section */}
        <div className={`space-y-1 border-t p-3 ${CHROME.divider}`}>
          <button
            onClick={() => alert("SwiftBill is free and open source under the MIT licence. You can contribute, report a bug, or read the docs on GitHub.")}
            className="flex w-full items-center justify-between rounded-[var(--radius-control)] px-3 py-2 text-body text-white/70 transition-colors hover:bg-white/10 hover:text-white cursor-pointer"
          >
            <span className="flex items-center gap-2.5">
              <HelpCircle className="h-4 w-4" />
              <span>Help &amp; docs</span>
            </span>
            <ChevronRight className="h-3.5 w-3.5 text-white/40" />
          </button>

          <div className="flex items-center justify-between px-3 pt-2 text-left text-micro text-white/45">
            <span>Works offline</span>
            <span className="num">v1.0.0</span>
          </div>
        </div>
      </aside>
    </>
  );
}
