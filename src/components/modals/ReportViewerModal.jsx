import React, { useState } from 'react';
import { X, Download, Printer, Search, FileText, ArrowDownLeft, ArrowUpRight, CheckCircle2, Clock } from 'lucide-react';
import { useDashboard } from '../../context/DashboardContext';

export default function ReportViewerModal() {
  const { activeReportModal, setActiveReportModal, currentData } = useDashboard();
  const [searchTerm, setSearchTerm] = useState('');

  if (!activeReportModal) return null;

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val || 0);
  };

  const partyOf = (tx) => tx.party_name || tx.partyName || (tx.type === 'sale' ? 'Cash Customer' : 'Supplier');
  const dateOf = (tx) => (tx.created_at ? new Date(tx.created_at) : null);
  const paymentOf = (tx) => tx.payment_mode || tx.paymentMethod || 'Cash';

  const filteredTransactions = currentData.transactions.filter(t => {
    const q = searchTerm.toLowerCase();
    return (
      partyOf(t).toLowerCase().includes(q) ||
      String(t.id).toLowerCase().includes(q)
    );
  });

  // CSV export built from the currently filtered rows
  const handleExportCsv = () => {
    const rows = [
      ['Invoice ID', 'Date', 'Party', 'Type', 'Payment Mode', 'Amount (INR)'],
      ...filteredTransactions.map(tx => [
        tx.id,
        (dateOf(tx) || new Date()).toLocaleString('en-IN'),
        partyOf(tx),
        tx.type || '',
        paymentOf(tx),
        Number(tx.amount || 0).toFixed(2)
      ])
    ];

    const csv = rows
      .map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(activeReportModal.title || 'report').replace(/[^a-z0-9]+/gi, '_').toLowerCase()}_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-2 sm:p-4 animate-fadeIn"
      onClick={() => setActiveReportModal(null)}
    >
      <div
        className="print-area bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-[#1E1B4B] text-white px-4 sm:px-6 py-4 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-indigo-400" />
              <h3 className="font-bold text-base sm:text-lg">{activeReportModal.title}</h3>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              {new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })} • Live Ledger
            </p>
          </div>
          <button
            onClick={() => setActiveReportModal(null)}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar: Search, Filter, Export */}
        <div className="p-3 sm:p-4 border-b border-slate-100 bg-slate-50/70 flex flex-wrap items-center justify-between gap-2.5">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by party or invoice ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-200 text-xs sm:text-sm bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCsv}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export</span>
            </button>
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print</span>
            </button>
          </div>
        </div>

        {/* Report Content Body */}
        <div className="p-3 sm:p-5 overflow-y-auto flex-1 text-left">
          {/* Summary Mini Cards */}
          <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-4 text-center">
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
              <div className="text-[10px] sm:text-xs text-slate-500 uppercase font-semibold">Total Records</div>
              <div className="text-sm sm:text-base font-bold text-slate-800 mt-0.5">{filteredTransactions.length}</div>
            </div>
            <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-100">
              <div className="text-[10px] sm:text-xs text-emerald-700 uppercase font-semibold">Sales Total</div>
              <div className="text-sm sm:text-base font-bold text-emerald-700 mt-0.5">
                {formatCurrency(filteredTransactions.filter(t => t.type === 'sale').reduce((s, t) => s + Number(t.amount || 0), 0))}
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-purple-50 border border-purple-100">
              <div className="text-[10px] sm:text-xs text-purple-700 uppercase font-semibold">Payables Due</div>
              <div className="text-sm sm:text-base font-bold text-purple-700 mt-0.5">
                {formatCurrency(filteredTransactions.filter(t => t.type === 'purchase').reduce((s, t) => s + Number(t.amount || 0), 0))}
              </div>
            </div>
          </div>

          {/* List or Table */}
          {filteredTransactions.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <FileText className="w-10 h-10 mx-auto text-slate-300 stroke-1" />
              <p className="text-sm font-semibold text-slate-600 mt-2">No matching transactions found</p>
              <p className="text-xs text-slate-400">Try adjusting your search terms or add a new invoice.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredTransactions.map((tx) => {
                const isSale = tx.type === 'sale';
                const d = dateOf(tx);
                return (
                  <div
                    key={tx.id}
                    className="p-3 rounded-xl border border-slate-100 hover:border-slate-200 bg-white hover:bg-slate-50/50 flex items-center justify-between gap-2 transition-all shadow-2xs"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        isSale ? 'bg-emerald-50 text-emerald-600' : 'bg-purple-50 text-purple-600'
                      }`}>
                        {isSale ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-xs sm:text-sm text-slate-800">{partyOf(tx)}</span>
                          <span className="text-[10px] px-1.5 rounded bg-slate-100 text-slate-600 font-mono font-bold">
                            {String(tx.id).slice(0, 12)}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          {d ? d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'} • {paymentOf(tx)}
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className={`font-bold text-xs sm:text-sm ${isSale ? 'text-emerald-600' : 'text-slate-800'}`}>
                        {isSale ? '+' : '-'}{formatCurrency(tx.amount)}
                      </div>
                      <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.2 rounded ${
                        tx.synced ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {tx.synced ? <CheckCircle2 className="w-2.5 h-2.5" /> : <Clock className="w-2.5 h-2.5" />}
                        {tx.synced ? 'Synced' : 'Pending sync'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 sm:p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end">
          <button
            onClick={() => setActiveReportModal(null)}
            className="px-4 py-2 rounded-xl bg-slate-800 text-white text-xs font-semibold hover:bg-slate-900 transition-colors"
          >
            Close Report
          </button>
        </div>
      </div>
    </div>
  );
}
