import React from 'react';
import { Minus, Plus, Trash2 } from 'lucide-react';
import Money from '../../ui/Money';

// One line of the bill: what it is, what it costs, how many, and the way out.
export default function CartLine({ item, onQty, onRemove }) {
  return (
    <div className="flex items-center justify-between gap-2 p-3">
      <div className="min-w-0 pr-2">
        <div className="truncate text-body font-bold text-ink">{item.name}</div>
        <div className="num mt-0.5 text-micro text-ink-subtle">
          <Money value={item.rate} tone="muted" className="text-micro" /> each
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-3">
        <div className="flex items-center overflow-hidden rounded-[var(--radius-control)] bg-surface-2 ring-1 ring-hairline/70">
          <button
            type="button"
            onClick={() => onQty(item.id, -1)}
            aria-label={`Reduce quantity of ${item.name}`}
            className="px-2 py-1 text-ink-muted transition-colors hover:bg-surface-3 hover:text-ink cursor-pointer"
          >
            <Minus className="h-3 w-3" />
          </button>
          <span className="num px-2.5 text-body font-bold text-ink">{item.quantity}</span>
          <button
            type="button"
            onClick={() => onQty(item.id, 1)}
            aria-label={`Increase quantity of ${item.name}`}
            className="px-2 py-1 text-ink-muted transition-colors hover:bg-surface-3 hover:text-ink cursor-pointer"
          >
            <Plus className="h-3 w-3" />
          </button>
        </div>

        <Money value={item.total} className="min-w-[60px] text-right text-body font-extrabold" />

        <button
          type="button"
          onClick={() => onRemove(item.id)}
          aria-label={`Remove ${item.name} from cart`}
          className="rounded-lg p-1 text-ink-subtle transition-colors hover:bg-[var(--color-danger)]/10 hover:text-[var(--color-danger)] cursor-pointer"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
