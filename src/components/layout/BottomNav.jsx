import React from 'react';
import { LayoutDashboard, PlusCircle, ShoppingCart, Menu } from 'lucide-react';
import { useDashboard } from '../../context/DashboardContext';

export default function BottomNav() {
  const {
    activeNavTab,
    setActiveNavTab,
    setIsAddSaleOpen,
    setIsCheckoutOpen,
    setIsAddPurchaseOpen,
    setIsMobileDrawerOpen,
  } = useDashboard();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 lg:hidden bg-white border-t border-slate-200/90 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] pb-safe">
      <div className="grid grid-cols-4 h-16 max-w-md mx-auto items-center px-2">
        {/* 1. Home Tab */}
        <button
          onClick={() => setActiveNavTab('home')}
          className={`flex flex-col items-center justify-center h-full transition-colors active:scale-95 cursor-pointer ${
            activeNavTab === 'home'
              ? 'text-indigo-950 font-semibold'
              : 'text-slate-500 hover:text-slate-700'
          }`}
          aria-label="Home Dashboard"
        >
          <div className={`relative p-1 rounded-xl transition-all ${
            activeNavTab === 'home' ? 'bg-indigo-50 text-indigo-900' : ''
          }`}>
            <LayoutDashboard className="w-5 h-5" />
          </div>
          <span className="text-[11px] tracking-tight mt-0.5">Home</span>
        </button>

        {/* 2. Add Sale Tab (Mobile Checkout Bottom Sheet) */}
        <button
          onClick={() => setIsCheckoutOpen(true)}
          className="flex flex-col items-center justify-center h-full text-emerald-600 hover:text-emerald-700 active:scale-95 transition-colors cursor-pointer"
          aria-label="Add Sale invoice"
        >
          <div className="p-1 rounded-xl bg-emerald-50 text-emerald-600">
            <PlusCircle className="w-5 h-5" />
          </div>
          <span className="text-[11px] font-bold tracking-tight mt-0.5 text-emerald-700">Add Sale</span>
        </button>

        {/* 3. Add Purchase Tab */}
        <button
          onClick={() => setIsAddPurchaseOpen(true)}
          className="flex flex-col items-center justify-center h-full text-purple-600 hover:text-purple-700 active:scale-95 transition-colors cursor-pointer"
          aria-label="Add Purchase bill"
        >
          <div className="p-1 rounded-xl bg-purple-50 text-purple-600">
            <ShoppingCart className="w-5 h-5" />
          </div>
          <span className="text-[11px] font-medium tracking-tight mt-0.5 text-purple-700">Add Purchase</span>
        </button>

        {/* 4. Menu Drawer Tab */}
        <button
          onClick={() => setIsMobileDrawerOpen(true)}
          className="flex flex-col items-center justify-center h-full text-slate-500 hover:text-slate-800 active:scale-95 transition-colors cursor-pointer"
          aria-label="Open Full Menu"
        >
          <div className="p-1 rounded-xl hover:bg-slate-100 text-slate-600">
            <Menu className="w-5 h-5" />
          </div>
          <span className="text-[11px] tracking-tight mt-0.5">Menu</span>
        </button>
      </div>
    </nav>
  );
}
