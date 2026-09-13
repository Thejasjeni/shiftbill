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
  Sparkles,
  ChevronRight,
  ShieldAlert,
  HelpCircle,
  LogOut,
  Building2
} from 'lucide-react';
import { useDashboard } from '../../context/DashboardContext';
import { NAVIGATION_ITEMS } from '../../data/mockData';

const ICONS_MAP = {
  LayoutDashboard,
  Users,
  Package,
  TrendingUp,
  ShoppingBag,
  FileBarChart,
  Settings,
};

export default function Sidebar() {
  const {
    isMobileDrawerOpen,
    setIsMobileDrawerOpen,
    activeNavTab,
    setActiveNavTab,
    setIsUpgradeModalOpen,
    businessInfo,
    currentData
  } = useDashboard();

  const getDynamicCount = (id) => {
    if (!currentData) return null;
    if (id === 'parties') return currentData.parties.length || null;
    if (id === 'items') return currentData.items.length || null;
    if (id === 'sale') return currentData.transactions.filter(t => t.type === 'sale').length || null;
    if (id === 'purchase') return currentData.transactions.filter(t => t.type === 'purchase').length || null;
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
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-xs transition-opacity lg:hidden"
          aria-hidden="true"
        />
      )}

      {/* Sidebar / Mobile Drawer Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-72 bg-[#1E1B4B] text-slate-200 flex flex-col justify-between transition-transform duration-300 ease-in-out shadow-2xl lg:shadow-none lg:static lg:translate-x-0 ${
          isMobileDrawerOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Top Header / Profile Info */}
        <div>
          <div className="flex items-center justify-between p-4 border-b border-indigo-900/60">
            <div className="flex items-center gap-3">
              <img
                src="/logo.png"
                alt="SwiftBill Logo"
                className="w-10 h-10 rounded-xl object-contain shadow-lg ring-1 ring-white/20"
              />
              <div className="flex flex-col text-left overflow-hidden">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-white text-base tracking-tight">
                    SwiftBill
                  </span>
                  <span className="text-[9px] uppercase font-bold px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    FOSS
                  </span>
                </div>
                <span className="text-xs text-indigo-200 truncate max-w-[150px]">
                  {businessInfo.name}
                </span>
                <span className="text-[10px] text-indigo-300/80 font-mono">
                  {businessInfo.gstin}
                </span>
              </div>
            </div>

            {/* Mobile Close Button */}
            <button
              onClick={() => setIsMobileDrawerOpen(false)}
              className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 active:bg-white/20 transition-colors"
              aria-label="Close menu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Open Source Status Strip (Replaces subscription warning) */}
          <div className="mx-3 mt-3 p-2.5 rounded-xl bg-gradient-to-r from-indigo-900/60 to-emerald-950/40 border border-emerald-500/30 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
              <div className="text-left">
                <div className="text-xs font-semibold text-emerald-200 leading-none">Community Edition</div>
                <div className="text-[10px] text-slate-300 leading-tight mt-0.5">100% Free • No Subscription</div>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold uppercase tracking-wider">
              Free
            </span>
          </div>

          {/* Main Navigation Links */}
          <nav className="p-3 space-y-1 mt-2 text-left">
            <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-indigo-300/60">
              Main Menu
            </div>
            {NAVIGATION_ITEMS.map((item) => {
              const Icon = ICONS_MAP[item.icon] || LayoutDashboard;
              const isActive = activeNavTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all group cursor-pointer ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 font-semibold'
                      : 'text-slate-300 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-5 h-5 transition-transform group-hover:scale-105 ${
                      isActive ? 'text-white' : 'text-indigo-300 group-hover:text-white'
                    }`} />
                    <span>{item.label}</span>
                  </div>
                  {getDynamicCount(item.id) && (
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        isActive
                          ? 'bg-indigo-700/80 text-white'
                          : 'bg-indigo-950 text-indigo-300 border border-indigo-800/60'
                      }`}
                    >
                      {getDynamicCount(item.id)}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Utility / Open Source Community Section */}
        <div className="p-3 border-t border-indigo-900/60 space-y-1">
          <button
            onClick={() => alert("SwiftBill Open Source: Free forever under MIT license. No credit card or subscription required!")}
            className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs text-slate-300 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <HelpCircle className="w-4 h-4 text-indigo-300" />
              <span>Community & Docs</span>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-indigo-400" />
          </button>
          
          <div className="pt-2 px-3 text-[11px] text-slate-400 text-left flex justify-between items-center">
            <span>SwiftBill v1.0.0 (FOSS)</span>
            <span className="text-emerald-400 flex items-center gap-1 font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> Offline Ready
            </span>
          </div>
        </div>
      </aside>
    </>
  );
}
