import React, { useState } from 'react';
import { Plus, Receipt, ShoppingCart, Fuel } from 'lucide-react';
import { useDashboard } from '../../context/DashboardContext';

export default function FloatingActionButton() {
  const { setIsCheckoutOpen, setIsAddPurchaseOpen, setIsAddExpenseOpen } = useDashboard();
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="fixed bottom-20 lg:bottom-8 right-4 lg:right-8 z-40 flex flex-col items-end gap-2.5">
      {/* Speed dial items if expanded */}
      {isExpanded && (
        <div className="flex flex-col items-end gap-2 mb-1 animate-fadeIn">
          {/* Add Expense (Petrol etc.) Option */}
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-lg bg-[#1E1B4B] text-white text-xs font-semibold shadow-md whitespace-nowrap">
              Add Expense / Petrol
            </span>
            <button
              onClick={() => {
                setIsExpanded(false);
                setIsAddExpenseOpen(true);
              }}
              className="w-11 h-11 rounded-full bg-amber-500 hover:bg-amber-600 text-white flex items-center justify-center shadow-lg active:scale-95 transition-all cursor-pointer"
              aria-label="Add Expense"
            >
              <Fuel className="w-5 h-5" />
            </button>
          </div>

          {/* Add Purchase Option */}
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-lg bg-[#1E1B4B] text-white text-xs font-semibold shadow-md whitespace-nowrap">
              Add Purchase
            </span>
            <button
              onClick={() => {
                setIsExpanded(false);
                setIsAddPurchaseOpen(true);
            }}
              className="w-11 h-11 rounded-full bg-purple-600 hover:bg-purple-700 text-white flex items-center justify-center shadow-lg active:scale-95 transition-all cursor-pointer"
              aria-label="Add Purchase"
            >
              <ShoppingCart className="w-5 h-5" />
            </button>
          </div>

          {/* Add Sale Option */}
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-lg bg-[#1E1B4B] text-white text-xs font-semibold shadow-md whitespace-nowrap">
              Mobile POS Checkout
            </span>
            <button
              onClick={() => {
                setIsExpanded(false);
                setIsCheckoutOpen(true);
              }}
              className="w-11 h-11 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center shadow-lg active:scale-95 transition-all cursor-pointer"
              aria-label="Add Sale Invoice"
            >
              <Receipt className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Main Primary FAB Button */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="group flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-tr from-indigo-700 via-indigo-600 to-indigo-500 hover:from-indigo-800 hover:to-indigo-600 text-white shadow-[0_8px_25px_rgba(79,70,229,0.4)] active:scale-90 transition-all duration-200 cursor-pointer border-2 border-white/20"
        aria-label="Quick Add Invoice"
        title="Quick Invoice Action"
      >
        <Plus
          className={`w-7 h-7 stroke-[2.5] transition-transform duration-200 ${
            isExpanded ? 'rotate-45' : 'group-hover:rotate-90'
          }`}
        />
      </button>
    </div>
  );
}
