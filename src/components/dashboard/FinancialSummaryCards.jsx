import React from 'react';
import { ArrowDown, ArrowUp, ChevronRight, Users, Building, Package, Boxes } from 'lucide-react';
import { useDashboard } from '../../context/DashboardContext';
import Surface from '../ui/Surface';
import Money from '../ui/Money';
import Badge from '../ui/Badge';

export default function FinancialSummaryCards() {
  const { currentData, setActiveReportModal } = useDashboard();

  const saleCount = currentData.transactions.filter((t) => t.type === 'sale').length;
  const purchaseCount = currentData.transactions.filter((t) => t.type === 'purchase').length;

  return (
    <section className="w-full space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
        {/* Money in */}
        <Surface
          interactive
          onClick={() => setActiveReportModal({ id: 'party-statement', title: 'Customer Receivables Ledger' })}
          className="group relative overflow-hidden"
        >
          <span className="absolute inset-y-0 left-0 w-1 rounded-l-[var(--radius-card)] bg-[var(--color-in)]" aria-hidden="true" />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-micro font-semibold uppercase tracking-wider text-ink-subtle">
                Total Receivable
              </span>
              <Badge tone="in">To collect</Badge>
            </div>
            <span className="grid h-9 w-9 place-items-center rounded-[var(--radius-control)] bg-[var(--color-in)]/10 text-[var(--color-in)] transition-colors group-hover:bg-[var(--color-in)] group-hover:text-white">
              <ArrowDown className="h-4 w-4" strokeWidth={2.5} />
            </span>
          </div>

          <div className="mt-3 flex items-baseline justify-between gap-2">
            <Money value={currentData.totalReceivable} tone="in" className="text-display font-extrabold" />
            <span className="flex items-center gap-0.5 text-micro font-medium text-[var(--color-in)] transition-transform group-hover:translate-x-0.5">
              View parties
              <ChevronRight className="h-3.5 w-3.5" />
            </span>
          </div>

          <div className="mt-3 flex items-center gap-1.5 border-t border-hairline/60 pt-3 text-micro text-ink-muted">
            <Users className="h-3.5 w-3.5 text-ink-subtle" />
            <span>
              {currentData.totalReceivable > 0 ? `${saleCount} ${saleCount === 1 ? 'bill' : 'bills'}` : 'Nothing overdue'}
            </span>
          </div>
        </Surface>

        {/* Money out */}
        <Surface
          interactive
          onClick={() => setActiveReportModal({ id: 'daybook-report', title: 'Supplier Payables Ledger' })}
          className="group relative overflow-hidden"
        >
          <span className="absolute inset-y-0 left-0 w-1 rounded-l-[var(--radius-card)] bg-[var(--color-out)]" aria-hidden="true" />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-micro font-semibold uppercase tracking-wider text-ink-subtle">
                Total Payable
              </span>
              <Badge tone="out">To pay</Badge>
            </div>
            <span className="grid h-9 w-9 place-items-center rounded-[var(--radius-control)] bg-[var(--color-out)]/10 text-[var(--color-out)] transition-colors group-hover:bg-[var(--color-out)] group-hover:text-white">
              <ArrowUp className="h-4 w-4" strokeWidth={2.5} />
            </span>
          </div>

          <div className="mt-3 flex items-baseline justify-between gap-2">
            <Money value={currentData.totalPayable} tone="out" className="text-display font-extrabold" />
            <span className="flex items-center gap-0.5 text-micro font-medium text-[var(--color-out)] transition-transform group-hover:translate-x-0.5">
              View bills
              <ChevronRight className="h-3.5 w-3.5" />
            </span>
          </div>

          <div className="mt-3 flex items-center gap-1.5 border-t border-hairline/60 pt-3 text-micro text-ink-muted">
            <Building className="h-3.5 w-3.5 text-ink-subtle" />
            <span>
              {currentData.totalPayable > 0 ? `${purchaseCount} ${purchaseCount === 1 ? 'bill' : 'bills'}` : 'Nothing due'}
            </span>
          </div>
        </Surface>
      </div>

      {/* Catalogue strip. Replaces a "Cash in Hand / Bank Balance" pair that
          restated the receivable and a hard-coded ₹0 — two numbers a shopkeeper
          would read as facts and neither of which was one. */}
      <Surface padding="sm" elevation={1} className="flex flex-wrap items-center justify-between gap-3 text-micro text-ink-muted">
        <span className="flex items-center gap-1.5">
          <Package className="h-3.5 w-3.5 text-ink-subtle" />
          {currentData.items.length} {currentData.items.length === 1 ? 'item' : 'items'} in the catalogue
        </span>
        <span className="flex items-center gap-1.5">
          <Boxes className="h-3.5 w-3.5 text-ink-subtle" />
          Stock value
          <Money value={currentData.stockValue} tone="muted" className="text-ink" />
        </span>
      </Surface>
    </section>
  );
}
