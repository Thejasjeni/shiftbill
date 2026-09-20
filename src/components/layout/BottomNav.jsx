import React from 'react';
import { LayoutDashboard, PlusCircle, ShoppingCart, Menu, Fuel } from 'lucide-react';
import { useDashboard } from '../../context/DashboardContext';

export default function BottomNav() {
  const {
    activeNavTab,
    setActiveNavTab,
    setIsCheckoutOpen,
    setIsAddPurchaseOpen,
    setIsAddExpenseOpen,
    setIsMobileDrawerOpen,
  } = useDashboard();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 lg:hidden border-t border-hairline/70 bg-surface/95 pb-safe shadow-[0_-4px_20px_rgba(16,24,40,0.06)] backdrop-blur-md">
      <div className="grid grid-cols-5 h-16 max-w-md mx-auto items-center px-2">
        {/* 1. Home Tab */}
        <button
          onClick={() => setActiveNavTab('home')}
          className={`flex flex-col items-center justify-center h-full transition-colors active:scale-95 cursor-pointer ${
            activeNavTab === 'home'
              ? 'text-ink font-semibold'
              : 'text-ink-muted hover:text-ink'
          }`}
          aria-label="Home Dashboard"
        >
          <div className={`relative p-1 rounded-xl transition-all ${
            activeNavTab === 'home' ? 'bg-[var(--color-brand)]/10 text-[var(--color-brand)]' : ''
          }`}>
            <LayoutDashboard className="w-5 h-5" />
          </div>
          <span className="text-[11px] tracking-tight mt-0.5">Home</span>
        </button>

        {/* 2. Add Sale Tab (Mobile Checkout Bottom Sheet) */}
        <button
          onClick={() => setIsCheckoutOpen(true)}
          className="flex flex-col items-center justify-center h-full text-[var(--color-in)] hover:opacity-80 active:scale-95 transition-all cursor-pointer"
          aria-label="Add Sale invoice"
        >
          <div className="p-1 rounded-xl bg-[var(--color-in)]/10">
            <PlusCircle className="w-5 h-5" />
          </div>
          <span className="text-[11px] font-bold tracking-tight mt-0.5">Add Sale</span>
        </button>

        {/* 3. Add Purchase Tab */}
        <button
          onClick={() => setIsAddPurchaseOpen(true)}
          className="flex flex-col items-center justify-center h-full text-[var(--color-out)] hover:opacity-80 active:scale-95 transition-all cursor-pointer"
          aria-label="Add Purchase bill"
        >
          <div className="p-1 rounded-xl bg-[var(--color-out)]/10">
            <ShoppingCart className="w-5 h-5" />
          </div>
          <span className="text-[11px] font-medium tracking-tight mt-0.5">Add Purchase</span>
        </button>

        {/* 3b. Add Expense (Petrol etc.) */}
        <button
          onClick={() => setIsAddExpenseOpen(true)}
          className="flex flex-col items-center justify-center h-full text-[var(--color-warn)] hover:opacity-80 active:scale-95 transition-all cursor-pointer"
          aria-label="Add Expense"
        >
          <div className="p-1 rounded-xl bg-[var(--color-warn)]/10">
            <Fuel className="w-5 h-5" />
          </div>
          <span className="text-[11px] font-medium tracking-tight mt-0.5">Expense</span>
        </button>

        {/* 4. Menu Drawer Tab */}
        <button
          onClick={() => setIsMobileDrawerOpen(true)}
          className="flex flex-col items-center justify-center h-full text-ink-muted hover:text-ink active:scale-95 transition-colors cursor-pointer"
          aria-label="Open Full Menu"
        >
          <div className="p-1 rounded-xl text-ink-muted hover:bg-surface-2">
            <Menu className="w-5 h-5" />
          </div>
          <span className="text-micro tracking-tight mt-0.5">Menu</span>
        </button>
      </div>
    </nav>
  );
}
