import React from 'react';
import { Menu, Search, Plus, Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { useDashboard } from '../../context/DashboardContext';
import AccountButton from './AccountButton';

export default function TopAppBar() {
  const {
    setIsMobileDrawerOpen,
    setIsSearchOpen,
    setIsCheckoutOpen,
    businessInfo,
    lastSynced,
    isOnline,
    pendingSyncCount,
    manualSync,
    isLoading
  } = useDashboard();

  return (
    <header className="sticky top-0 z-30 bg-[#1E1B4B] text-white shadow-md transition-all select-none">
      {/* Main Top Bar */}
      <div className="flex items-center justify-between px-3.5 py-2.5 sm:px-6 sm:py-3 max-w-7xl mx-auto w-full">
        {/* Left Section: Mobile Hamburger + Brand */}
        <div className="flex items-center gap-2.5 sm:gap-4">
          {/* Mobile Drawer Toggle */}
          <button
            onClick={() => setIsMobileDrawerOpen(true)}
            className="lg:hidden p-2 -ml-1 text-slate-200 hover:text-white hover:bg-white/10 active:bg-white/20 rounded-lg transition-colors cursor-pointer"
            aria-label="Open navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Brand & Store Name */}
          <div className="flex items-center gap-2.5">
            <img
              src="/logo.png"
              alt="SwiftBill Logo"
              className="w-8 h-8 rounded-xl object-contain shadow-md ring-1 ring-white/20"
            />
            <div className="flex flex-col text-left">
              <div className="flex items-center gap-1.5 cursor-pointer group">
                <span className="font-bold text-sm sm:text-base leading-tight tracking-tight text-white group-hover:text-indigo-200 transition-colors">
                  SwiftBill
                </span>
                <span className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hidden xs:inline-block">
                  POS
                </span>
              </div>
              <span className="text-[11px] text-slate-300 font-normal leading-none truncate max-w-[120px] sm:max-w-[200px]">
                {businessInfo.name || "My Store"}
              </span>
            </div>
          </div>
        </div>

        {/* Center / Right Section: Account, Offline Sync Pill, Search & Actions */}
        <div className="flex items-center gap-1.5 sm:gap-3">
          {/* Optional Google sign-in (never gates the app) */}
          <AccountButton />

          {/* Online/Offline & Sync Status Pill */}
          <button
            onClick={manualSync}
            disabled={isLoading}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all cursor-pointer ${
              isOnline
                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/25'
                : 'bg-rose-500/15 border-rose-500/30 text-rose-300 hover:bg-rose-500/25'
            }`}
            title={
              pendingSyncCount > 0
                ? `${pendingSyncCount} bill${pendingSyncCount === 1 ? '' : 's'} waiting to upload`
                : isOnline
                  ? 'All bills saved to the cloud'
                  : 'Bills are saved on this device and upload automatically when you are back online'
            }
          >
            {isOnline ? (
              <Wifi className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <WifiOff className="w-3.5 h-3.5 text-rose-400" />
            )}
            <span className="hidden xs:inline">{isOnline ? 'Online' : 'Offline'}</span>
            {pendingSyncCount > 0 && (
              <span className="px-1 rounded-full bg-amber-500 text-slate-950 font-bold text-[9px]">
                {pendingSyncCount}
              </span>
            )}
            <RefreshCw className={`w-3 h-3 text-slate-300 ${isLoading ? 'animate-spin' : ''}`} />
          </button>

          {/* Minimal Search Trigger */}
          <button
            onClick={() => setIsSearchOpen(true)}
            className="p-2 text-slate-300 hover:text-white hover:bg-white/10 active:bg-white/20 rounded-full transition-colors cursor-pointer"
            aria-label="Search transactions, parties or items"
          >
            <Search className="w-5 h-5" />
          </button>

          {/* Prominent Quick Action "+ Sale" Button (Opens Mobile POS Checkout Bottom Sheet) */}
          <button
            onClick={() => setIsCheckoutOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 active:scale-95 text-white text-xs sm:text-sm font-bold rounded-xl shadow-sm hover:shadow-emerald-500/20 transition-all cursor-pointer"
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
