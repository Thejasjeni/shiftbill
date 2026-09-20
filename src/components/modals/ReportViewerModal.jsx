import React, { useState } from 'react';
import { X, Download, Printer, Search, FileText, ArrowDownLeft, ArrowUpRight, CheckCircle2, Clock, Trash2 } from 'lucide-react';
import { useDashboard } from '../../context/DashboardContext';
import { formatINR } from '../../utils/money';
import Badge from '../ui/Badge';
import EmptyState from '../ui/EmptyState';
import Money from '../ui/Money';
import { BUTTON, DIALOG, FIELD } from '../ui/controls';

export default function ReportViewerModal() {
  const { activeReportModal, setActiveReportModal, currentData, deleteTransaction } = useDashboard();
  const [searchTerm, setSearchTerm] = useState('');
  const [deletingId, setDeletingId] = useState(null);

  if (!activeReportModal) return null;

  const partyOf = (tx) => tx.party_name || tx.partyName || (tx.type === 'sale' ? 'Cash Customer' : 'Supplier');
  const dateOf = (tx) => (tx.created_at ? new Date(tx.created_at) : null);
  const paymentOf = (tx) => tx.payment_mode || tx.paymentMethod || 'Cash';

  // Delete a transaction row (sale = receivable, purchase = payable)
  const handleDelete = async (tx) => {
    const label = tx.type === 'sale' ? 'receivable entry' : 'payable entry';
    if (!window.confirm(`Delete this ${label} of ${formatINR(tx.amount)} for ${partyOf(tx)}? This cannot be undone.`)) return;

    setDeletingId(tx.id);
    const res = await deleteTransaction(tx.id);
    setDeletingId(null);
    if (!res?.success) {
      window.alert(res?.error || 'Could not delete this entry. Please try again.');
    }
  };

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
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(activeReportModal.title || 'report').replace(/[^a-z0-9]+/gi, '_').toLowerCase()}_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // The card itself is the .print-area: the screen version and the printed
  // version are the same document, so only one layout can drift.
  return (
    <div className={DIALOG.overlay} onClick={() => setActiveReportModal(null)}>
      <div
        className="print-area flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-[var(--radius-card)] bg-surface shadow-e3 ring-1 ring-hairline/70"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-2 bg-[var(--color-brand-deep)] px-4 py-4 text-white sm:px-6">
          <div>
            <div className="flex items-center gap-2">
              <FileText className={DIALOG.icon} />
              <h3 className="text-title font-bold">{activeReportModal.title}</h3>
            </div>
            <p className="mt-0.5 text-micro text-white/70">
              {new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })} · your live ledger
            </p>
          </div>
          <button
            onClick={() => setActiveReportModal(null)}
            className={DIALOG.close}
            aria-label="Close report"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Toolbar: Search, Export, Print — screen only, never on paper */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-hairline/60 bg-surface-2/70 p-3 sm:p-4">
          <div className="relative min-w-[180px] flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-ink-subtle" />
            <input
              type="text"
              placeholder="Search by party or bill number…"
              aria-label="Search this report"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`${FIELD} pl-9`}
            />
          </div>

          <div className="flex items-center gap-2">
            <button onClick={handleExportCsv} className={BUTTON.secondary}>
              <Download className="h-3.5 w-3.5" />
              <span>Export CSV</span>
            </button>
            <button onClick={() => window.print()} className={BUTTON.primary}>
              <Printer className="h-3.5 w-3.5" />
              <span>Print</span>
            </button>
          </div>
        </div>

        {/* Report Content Body */}
        <div className="flex-1 overflow-y-auto p-3 text-left sm:p-5">
          {/* Summary tiles */}
          <div className="mb-4 grid grid-cols-3 gap-2 text-center sm:gap-3">
            <div className="rounded-[var(--radius-control)] bg-surface-2 px-2.5 py-2 ring-1 ring-hairline/60">
              <div className="text-micro font-semibold uppercase text-ink-muted">Entries</div>
              <div className="num mt-0.5 text-body font-bold text-ink">{filteredTransactions.length}</div>
            </div>
            <div className="rounded-[var(--radius-control)] bg-[var(--color-in)]/8 px-2.5 py-2 ring-1 ring-[var(--color-in)]/20">
              <div className="text-micro font-semibold uppercase text-[var(--color-in)]">Sales</div>
              <Money
                value={filteredTransactions.filter(t => t.type === 'sale').reduce((s, t) => s + Number(t.amount || 0), 0)}
                tone="in"
                className="mt-0.5 text-body font-bold"
              />
            </div>
            <div className="rounded-[var(--radius-control)] bg-[var(--color-out)]/8 px-2.5 py-2 ring-1 ring-[var(--color-out)]/20">
              <div className="text-micro font-semibold uppercase text-[var(--color-out)]">Payables due</div>
              <Money
                value={filteredTransactions.filter(t => t.type === 'purchase').reduce((s, t) => s + Number(t.amount || 0), 0)}
                tone="out"
                className="mt-0.5 text-body font-bold"
              />
            </div>
          </div>

          {/* List or Table */}
          {filteredTransactions.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="No matching entries"
              hint="Try a different name or bill number, or record a sale to fill this report."
            />
          ) : (
            <div className="space-y-2">
              {filteredTransactions.map((tx) => {
                const isSale = tx.type === 'sale';
                const d = dateOf(tx);
                return (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between gap-2 rounded-[var(--radius-control)] bg-surface p-3 ring-1 ring-hairline/60 transition-colors hover:bg-surface-2/60"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className={`grid h-8 w-8 shrink-0 place-items-center rounded-[var(--radius-control)] ${
                        isSale ? 'bg-[var(--color-in)]/10 text-[var(--color-in)]' : 'bg-[var(--color-out)]/10 text-[var(--color-out)]'
                      }`}>
                        {isSale ? <ArrowDownLeft className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="truncate text-body font-semibold text-ink">{partyOf(tx)}</span>
                          <span className="num shrink-0 rounded bg-surface-2 px-1.5 text-micro font-bold text-ink-muted">
                            {String(tx.id).slice(0, 12)}
                          </span>
                        </div>
                        <div className="num mt-0.5 text-micro text-ink-subtle">
                          {d ? d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'} · {paymentOf(tx)}
                        </div>
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-2 text-right">
                      <div>
                        <Money
                          value={isSale ? tx.amount : -tx.amount}
                          tone={isSale ? 'in' : 'out'}
                          signed
                          className="text-body font-bold"
                        />
                        <div className="mt-0.5 flex justify-end">
                          <Badge tone={tx.synced ? 'in' : 'warn'}>
                            {tx.synced ? <CheckCircle2 className="h-2.5 w-2.5" /> : <Clock className="h-2.5 w-2.5" />}
                            {tx.synced ? 'Synced' : 'Pending sync'}
                          </Badge>
                        </div>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(tx); }}
                        disabled={deletingId === tx.id}
                        title="Delete entry"
                        aria-label={`Delete transaction ${String(tx.id).slice(0, 8)}`}
                        className="shrink-0 rounded-[var(--radius-control)] p-1.5 text-ink-subtle transition-colors hover:bg-[var(--color-danger)]/10 hover:text-[var(--color-danger)] disabled:cursor-wait disabled:opacity-50 cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end border-t border-hairline/60 bg-surface-2 p-3 sm:p-4">
          <button onClick={() => setActiveReportModal(null)} className={BUTTON.secondary}>
            Close report
          </button>
        </div>
      </div>
    </div>
  );
}
