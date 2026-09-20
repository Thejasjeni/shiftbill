import React from 'react';
import { Menu, Search, Plus, RefreshCw } from 'lucide-react';
import { useDashboard } from '../../context/DashboardContext';
import AccountButton from './AccountButton';

export default function TopAppBar() {
  const {
    setIsMobileDrawerOpen,
    setIsSearchOpen,
    setIsCheckoutOpen,
    businessInfo,
    isOnline,
    pendingSyncCount,
    manualSync,
    isLoading
  } = useDashboard();

  return (
    <header className="sticky top-0 z-30 bg-[var(--color-brand-deep)] text-white shadow-e2 select-none">
      {/* Main Top Bar */}
      <div className="flex items-center justify-between gap-2 px-3.5 py-2.5 sm:px-6 sm:py-3 max-w-7xl mx-auto w-full">
        {/* Left Section: Mobile Hamburger + Brand */}
        <div className="flex items-center gap-2.5 sm:gap-4">
          {/* Mobile Drawer Toggle */}
          <button
            onClick={() => setIsMobileDrawerOpen(true)}
            className="lg:hidden p-2 -ml-1 text-white/75 hover:text-white hover:bg-white/10 active:bg-white/20 rounded-lg transition-colors cursor-pointer"
            aria-label="Open navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Brand & Store Name */}
          <div className="flex items-center gap-2.5 min-w-0">
            <img
              src="/logo.png"
              alt="SwiftBill Logo"
              className="w-8 h-8 rounded-xl object-contain ring-1 ring-white/15"
            />
            <div className="flex min-w-0 flex-col text-left">
              <span className="text-body font-bold leading-tight tracking-tight text-white">
                {businessInfo.name || 'My Store'}
              </span>
              <span className="text-micro leading-none text-white/55">Billing & books</span>
            </div>
          </div>
        </div>

        {/* Center / Right Section: Account, Offline Sync Pill, Search & Actions */}
        <div className="flex items-center gap-1.5 sm:gap-3">
          {/* Optional Google sign-in (never gates the app) */}
          <AccountButton />

          {/* Sync state: the dot reads at a glance, words appear from xs up,
              the full sentence lives on hover */}
          <button
            onClick={manualSync}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-micro font-medium ring-1 ring-white/15 transition-colors hover:bg-white/10 cursor-pointer disabled:opacity-70"
            title={
              pendingSyncCount > 0
                ? `${pendingSyncCount} bill${pendingSyncCount === 1 ? '' : 's'} waiting to upload`
                : isOnline
                  ? 'All bills saved to the cloud — tap to check now'
                  : 'Bills are saved on this device and upload automatically when you are back online'
            }
          >
            <span
              className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                pendingSyncCount > 0
                  ? 'bg-[var(--color-warn-bright)]'
                  : isOnline
                    ? 'bg-[var(--color-in-bright)]'
                    : 'bg-[var(--color-danger-bright)]'
              }`}
            />
            <span className="hidden xs:inline">
              {pendingSyncCount > 0 ? `${pendingSyncCount} waiting` : isOnline ? 'Synced' : 'Offline'}
            </span>
            <RefreshCw className={`h-3 w-3 text-white/55 ${isLoading ? 'animate-spin' : ''}`} />
          </button>

          {/* Search & commands: a labelled affordance on desktop, the ⌘K
              shortcut everywhere — so phones need no search button at all */}
          <button
            onClick={() => setIsSearchOpen(true)}
            className="hidden lg:inline-flex items-center gap-2 rounded-[var(--radius-control)] bg-white/10 px-2.5 py-1.5 text-micro font-medium text-white/75 transition-colors hover:bg-white/15 cursor-pointer"
            aria-label="Search and quick actions"
          >
            <Search className="h-3.5 w-3.5" />
            <span>Search</span>
            <kbd className="num rounded bg-white/10 px-1 text-[10px] text-white/55">⌘K</kbd>
          </button>

          {/* Quick Action "+ Sale" — the desktop path to the POS (the bottom nav
              owns it on phones, so there is one door per device) */}
          <button
            onClick={() => setIsCheckoutOpen(true)}
            className="hidden lg:inline-flex items-center gap-1.5 px-3.5 py-2 bg-[var(--color-in)] hover:opacity-95 active:scale-[0.97] text-white text-body font-bold rounded-[var(--radius-control)] shadow-e1 transition-all cursor-pointer"
            aria-label="Open POS Billing Checkout"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span className="tracking-wide">+ Sale</span>
          </button>
        </div>
      </div>
    </header>
  );
}
