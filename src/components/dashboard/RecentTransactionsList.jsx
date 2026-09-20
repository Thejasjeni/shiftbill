import React, { useState, useEffect } from 'react';
import { Clock, FileText, ChevronRight, Trash2, X, Share2 } from 'lucide-react';
import { useDashboard } from '../../context/DashboardContext';
import Surface from '../ui/Surface';
import Money from '../ui/Money';
import Badge from '../ui/Badge';
import EmptyState from '../ui/EmptyState';
import { shareInvoiceOnWhatsApp } from '../../utils/posUtilities';

const initials = (name = '') =>
  name.split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || '₹';

// A POS bill keeps the invoice fields, so it can be re-sent. Rows migrated from
// the old database carry no phone, and for them the action is hidden rather
// than sending a message addressed to nobody.
const shareableInvoice = (tx) => ({
  id: String(tx.id).slice(0, 8).toUpperCase(),
  date: tx.created_at ? new Date(tx.created_at).toLocaleDateString('en-IN') : undefined,
  amount: tx.amount,
  party_name: tx.party_name || tx.partyName || 'Cash Customer',
  pricing_tier: tx.pricing_tier || 'retail',
  items_json: tx.items_json || []
});

export default function RecentTransactionsList() {
  const { currentData, setActiveReportModal, deleteTransaction, businessInfo, setIsCheckoutOpen } = useDashboard();

  // Two-tap delete: the first tap arms the row's button, the second deletes.
  // Replaces a window.confirm(), which blocked the whole page — hostile on a
  // phone at a counter, and it froze automated UI driving twice before.
  const [armedId, setArmedId] = useState(null);
  useEffect(() => {
    if (armedId === null) return;
    const timer = setTimeout(() => setArmedId(null), 4000);
    return () => clearTimeout(timer);
  }, [armedId]);

  const transactions = currentData.transactions.slice(0, 5);

  const handleDeleteTap = (event, tx) => {
    event.stopPropagation(); // don't trigger the row's report-modal open
    if (armedId !== tx.id) {
      setArmedId(tx.id);
      return;
    }
    setArmedId(null);
    deleteTransaction(tx.id);
  };

  const handleShare = (event, tx) => {
    event.stopPropagation();
    shareInvoiceOnWhatsApp(tx.customer_phone, shareableInvoice(tx), businessInfo).catch((err) =>
      console.warn('Could not share bill:', err.message)
    );
  };

  return (
    <Surface padding="lg" elevation={1}>
      <div className="flex items-center justify-between border-b border-hairline/60 pb-3">
        <h2 className="flex items-center gap-2 text-title font-bold tracking-tight text-ink">
          <Clock className="h-4 w-4 text-[var(--color-brand)]" />
          Recent transactions
        </h2>
        <button
          onClick={() => setActiveReportModal({ id: 'all-transactions', title: 'All Transactions Log' })}
          className="flex items-center gap-0.5 text-micro font-semibold text-[var(--color-brand)] transition-colors hover:text-[var(--color-brand-deep)] cursor-pointer"
        >
          View all
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>

      {transactions.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No bills yet"
          hint="Take the first bill and it lands here — with today's sales, expenses and profit on the cards above."
          action={
            <button
              onClick={() => setIsCheckoutOpen(true)}
              className="rounded-[var(--radius-control)] bg-[var(--color-in)] px-3.5 py-2 text-micro font-bold text-white shadow-e1 transition-opacity hover:opacity-95 cursor-pointer"
            >
              + Take the first bill
            </button>
          }
        />
      ) : (
        <div className="divide-y divide-hairline/60">
          {transactions.map((tx) => {
            const isSale = tx.type === 'sale';
            const name = tx.party_name || tx.partyName || (isSale ? 'Cash Customer' : 'Supplier');
            const armed = armedId === tx.id;

            return (
              <div
                key={tx.id}
                onClick={() => setActiveReportModal({ id: 'all-transactions', title: `Transaction ${tx.id}` })}
                className="group -mx-2 flex items-center justify-between gap-2 rounded-[var(--radius-control)] px-2 py-3 transition-colors hover:bg-surface-2/60 cursor-pointer"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-surface-2 text-micro font-bold text-ink-muted ring-1 ring-hairline/70">
                    {initials(name)}
                  </span>
                  <div className="min-w-0 text-left">
                    <div className="flex items-center gap-2">
                      <span className="max-w-[140px] truncate text-body font-semibold text-ink sm:max-w-[200px]">
                        {name}
                      </span>
                      <Badge tone={isSale ? 'in' : tx.type === 'purchase' ? 'out' : 'warn'}>{tx.type}</Badge>
                    </div>
                    <div className="num mt-0.5 flex items-center gap-2 text-micro text-ink-subtle">
                      <span>{String(tx.id).slice(0, 8)}</span>
                      <span aria-hidden="true">·</span>
                      <span>
                        {tx.created_at
                          ? new Date(tx.created_at).toLocaleDateString('en-IN', {
                              day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                            })
                          : (tx.date || 'Recent')}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-1.5">
                  <div className="text-right">
                    <Money value={isSale ? tx.amount : -tx.amount} tone={isSale ? 'in' : 'out'} signed className="text-body" />
                    <div className="text-micro capitalize text-ink-subtle">{tx.type}</div>
                  </div>

                  {tx.customer_phone && !armed && (
                    <button
                      onClick={(event) => handleShare(event, tx)}
                      title="Send this bill on WhatsApp"
                      aria-label={`Share bill for ${name} on WhatsApp`}
                      className="rounded-lg p-1.5 text-ink-subtle transition-colors hover:bg-surface-3 hover:text-[var(--color-in)] cursor-pointer focus-visible:opacity-100"
                    >
                      <Share2 className="h-3.5 w-3.5" />
                    </button>
                  )}

                  {armed ? (
                    <span className="flex shrink-0 items-center gap-1">
                      <button
                        onClick={(event) => handleDeleteTap(event, tx)}
                        title="Tap again to delete — this cannot be undone"
                        aria-label={`Confirm delete transaction ${String(tx.id).slice(0, 8)}`}
                        className="shrink-0 rounded-lg bg-[var(--color-danger)] px-2 py-1 text-micro font-bold text-white transition-colors hover:opacity-90 cursor-pointer"
                      >
                        Delete
                      </button>
                      <button
                        onClick={(event) => { event.stopPropagation(); setArmedId(null); }}
                        aria-label="Keep transaction"
                        className="shrink-0 rounded-lg p-1.5 text-ink-subtle transition-colors hover:bg-surface-3 hover:text-ink cursor-pointer"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </span>
                  ) : (
                    <button
                      onClick={(event) => handleDeleteTap(event, tx)}
                      title="Delete bill"
                      aria-label={`Delete transaction ${String(tx.id).slice(0, 8)}`}
                      className="shrink-0 rounded-lg p-1.5 text-ink-subtle opacity-0 transition-[opacity,background-color,color] hover:bg-[var(--color-danger)]/10 hover:text-[var(--color-danger)] focus-visible:opacity-100 group-hover:opacity-100 group-focus-within:opacity-100 cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Surface>
  );
}
