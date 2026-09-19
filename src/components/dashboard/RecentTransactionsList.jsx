import React, { useState, useEffect } from 'react';
import { ArrowUpRight, ArrowDownLeft, Clock, FileText, ChevronRight, Trash2, X } from 'lucide-react';
import { useDashboard } from '../../context/DashboardContext';

export default function RecentTransactionsList() {
  const { currentData, setActiveReportModal, deleteTransaction } = useDashboard();

  // Two-tap delete: the first tap arms the row's button, the second deletes.
  // Replaces a window.confirm(), which blocked the whole page — hostile on a
  // phone at a counter, and it froze automated UI driving twice before.
  const [armedId, setArmedId] = useState(null);
  useEffect(() => {
    if (armedId === null) return;
    const disarm = () => setArmedId(null);
    const timer = setTimeout(disarm, 4000);
    return () => clearTimeout(timer);
  }, [armedId]);

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val || 0);
  };

  const transactions = currentData.transactions.slice(0, 5);

  const handleDeleteTap = (e, tx) => {
    e.stopPropagation(); // don't trigger the row's report-modal open
    if (armedId !== tx.id) {
      setArmedId(tx.id);
      return;
    }
    setArmedId(null);
    deleteTransaction(tx.id);
  };

  return (
    <section className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs transition-all">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-indigo-600" />
          <h2 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
            Recent Transactions
          </h2>
        </div>
        <button
          onClick={() => setActiveReportModal({ id: 'all-transactions', title: 'All Transactions Log' })}
          className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-0.5 cursor-pointer"
        >
          <span>View All</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Transaction List */}
      {transactions.length === 0 ? (
        <div className="py-8 text-center text-slate-400 space-y-1">
          <FileText className="w-8 h-8 mx-auto text-slate-300 stroke-1" />
          <p className="text-xs font-medium text-slate-500">No transactions recorded yet</p>
          <p className="text-[11px] text-slate-400">Click "+ Sale" above to create your first invoice</p>
        </div>
      ) : (
        <div className="divide-y divide-slate-100">
          {transactions.map((tx) => {
            const isSale = tx.type === 'sale';
            const isPurchase = tx.type === 'purchase';
            return (
              <div
                key={tx.id}
                onClick={() => setActiveReportModal({ id: 'all-transactions', title: `Transaction ${tx.id}` })}
                className="py-3 sm:py-3.5 flex items-center justify-between hover:bg-slate-50/70 rounded-xl px-2 -mx-2 transition-colors cursor-pointer group"
              >
                {/* Left: Icon & Details */}
                <div className="flex items-center gap-3">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                      isSale
                        ? 'bg-emerald-50 text-emerald-600'
                        : isPurchase
                        ? 'bg-purple-50 text-purple-600'
                        : 'bg-rose-50 text-rose-600'
                    }`}
                  >
                    {isSale ? (
                      <ArrowDownLeft className="w-4 h-4 stroke-[2.5]" />
                    ) : (
                      <ArrowUpRight className="w-4 h-4 stroke-[2.5]" />
                    )}
                  </div>
                  <div className="text-left">
                    <div className="flex items-center gap-2">
                      <span className="text-xs sm:text-sm font-semibold text-slate-800 group-hover:text-indigo-900 truncate max-w-[140px] sm:max-w-[200px]">
                        {tx.party_name || tx.partyName || (isSale ? 'Cash Customer' : 'Supplier')}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.2 rounded uppercase ${
                          isSale
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-purple-100 text-purple-700'
                        }`}
                      >
                        {tx.type}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-2">
                      <span className="font-mono">{typeof tx.id === 'string' && tx.id.length > 8 ? tx.id.slice(0, 8) : tx.id}</span>
                      <span>•</span>
                      <span>
                        {tx.created_at
                          ? new Date(tx.created_at).toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit'
                            })
                          : (tx.date || 'Recent')}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right: Amount + Delete */}
                <div className="text-right shrink-0 flex items-center gap-1.5">
                  <div>
                    <div
                      className={`text-xs sm:text-sm font-extrabold tracking-tight ${
                        isSale ? 'text-emerald-600' : 'text-purple-700'
                      }`}
                    >
                      {isSale ? '+' : '-'}{formatCurrency(tx.amount)}
                    </div>
                    <div className="text-[10px] text-slate-400 font-medium capitalize">
                      {tx.type}
                    </div>
                  </div>
                  {armedId === tx.id ? (
                    <span className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={(e) => handleDeleteTap(e, tx)}
                        title="Tap again to delete — this cannot be undone"
                        aria-label={`Confirm delete transaction ${String(tx.id).slice(0, 8)}`}
                        className="px-2 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-bold cursor-pointer shrink-0"
                      >
                        Delete
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); setArmedId(null); }}
                        aria-label="Keep transaction"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </span>
                  ) : (
                    <button
                      onClick={(e) => handleDeleteTap(e, tx)}
                      title="Delete entry"
                      aria-label={`Delete transaction ${String(tx.id).slice(0, 8)}`}
                      className="p-1.5 rounded-lg text-slate-300 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer opacity-0 group-hover:opacity-100 focus:opacity-100 shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
