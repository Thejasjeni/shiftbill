import React from 'react';
import { ArrowDown, ArrowUp, ChevronRight, Users, Building, Wallet, Landmark } from 'lucide-react';
import { useDashboard } from '../../context/DashboardContext';

export default function FinancialSummaryCards() {
  const { currentData, setActiveReportModal } = useDashboard();

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val || 0);
  };

  return (
    <section className="w-full space-y-3">
      {/* 2 Main Cards: Side-by-side on desktop, stacked on mobile */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        {/* Total Receivable Card */}
        <div
          onClick={() => setActiveReportModal({ id: 'party-statement', title: 'Customer Receivables Ledger' })}
          className="relative overflow-hidden bg-white border border-emerald-100 rounded-2xl p-4 sm:p-5 shadow-xs hover:shadow-md transition-all cursor-pointer group active:scale-[0.99]"
        >
          {/* Top Row: Label & Arrow Icon */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm font-semibold text-slate-500 uppercase tracking-wider">
                Total Receivable
              </span>
              <span className="text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/50">
                To Collect
              </span>
            </div>
            
            {/* Green Downward Arrow Icon */}
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-all shadow-xs">
              <ArrowDown className="w-5 h-5 stroke-[2.5]" />
            </div>
          </div>

          {/* Amount Display */}
          <div className="mt-3 flex items-baseline justify-between">
            <div className="text-2xl sm:text-3xl font-extrabold text-emerald-600 tracking-tight">
              {formatCurrency(currentData.totalReceivable)}
            </div>
            <div className="flex items-center text-xs font-medium text-emerald-700 group-hover:translate-x-0.5 transition-transform">
              <span>View Parties</span>
              <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
            </div>
          </div>

          {/* Bottom Micro-indicator */}
          <div className="mt-3 pt-3 border-t border-emerald-50 flex items-center justify-between text-xs text-slate-500">
            <div className="flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-slate-400" />
              <span>
                {currentData.totalReceivable > 0
                  ? `${currentData.transactions.filter(t => t.type === 'sale').length} sale transaction(s)`
                  : 'No overdue receivables'}
              </span>
            </div>
            <span className="text-[11px] text-emerald-600 font-medium">Safe flow</span>
          </div>

          {/* Decorative accent bar */}
          <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-emerald-500 rounded-l"></div>
        </div>

        {/* Total Payable Card */}
        <div
          onClick={() => setActiveReportModal({ id: 'daybook-report', title: 'Supplier Payables Ledger' })}
          className="relative overflow-hidden bg-white border border-purple-100 rounded-2xl p-4 sm:p-5 shadow-xs hover:shadow-md transition-all cursor-pointer group active:scale-[0.99]"
        >
          {/* Top Row: Label & Arrow Icon */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm font-semibold text-slate-500 uppercase tracking-wider">
                Total Payable
              </span>
              <span className="text-[11px] font-medium text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200/50">
                To Pay
              </span>
            </div>
            
            {/* Red / Light Purple Upward Arrow Icon */}
            <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center group-hover:bg-purple-600 group-hover:text-white transition-all shadow-xs">
              <ArrowUp className="w-5 h-5 stroke-[2.5]" />
            </div>
          </div>

          {/* Amount Display */}
          <div className="mt-3 flex items-baseline justify-between">
            <div className="text-2xl sm:text-3xl font-extrabold text-purple-700 tracking-tight">
              {formatCurrency(currentData.totalPayable)}
            </div>
            <div className="flex items-center text-xs font-medium text-purple-700 group-hover:translate-x-0.5 transition-transform">
              <span>View Bills</span>
              <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
            </div>
          </div>

          {/* Bottom Micro-indicator */}
          <div className="mt-3 pt-3 border-t border-purple-50 flex items-center justify-between text-xs text-slate-500">
            <div className="flex items-center gap-1.5">
              <Building className="w-3.5 h-3.5 text-slate-400" />
              <span>
                {currentData.totalPayable > 0
                  ? `${currentData.transactions.filter(t => t.type === 'purchase').length} purchase transaction(s)`
                  : 'No upcoming payables'}
              </span>
            </div>
            <span className="text-[11px] text-purple-600 font-medium">Safe flow</span>
          </div>

          {/* Decorative accent bar */}
          <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-purple-600 rounded-l"></div>
        </div>
      </div>

      {/* Mini Cash / Bank Bar (Instant liquidity indicator in SwiftBill) */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-2.5 sm:p-3 flex items-center justify-between text-xs text-slate-600">
        <div className="flex items-center gap-2 sm:gap-4 flex-1 divide-x divide-slate-100">
          <div className="flex items-center gap-1.5 pr-3">
            <Wallet className="w-3.5 h-3.5 text-amber-500" />
            <span className="text-slate-500">Cash in Hand:</span>
            <span className="font-semibold text-slate-800">{formatCurrency(currentData.cashInHand)}</span>
          </div>
          <div className="flex items-center gap-1.5 pl-3">
            <Landmark className="w-3.5 h-3.5 text-indigo-500" />
            <span className="text-slate-500">Bank Balance:</span>
            <span className="font-semibold text-slate-800">{formatCurrency(currentData.bankBalance)}</span>
          </div>
        </div>
      </div>
    </section>
  );
}
