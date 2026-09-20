import React from 'react';
import { Camera } from 'lucide-react';
import Money from '../../ui/Money';
import { stockState, stockOf } from '../../../utils/stock';

// The catalogue as one tap per item. Out-of-stock items stay tappable — a stale
// count must never stop a sale — but they say so first, and the parent warns.
export default function ItemChips({ items, tier, onAdd, onScan }) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-micro font-bold uppercase tracking-wider text-ink-muted">
          Add items to bill
        </span>
        <button
          type="button"
          onClick={onScan}
          className="flex items-center gap-1.5 rounded-[var(--radius-control)] bg-[var(--color-brand)] px-3 py-1 text-micro font-bold text-white shadow-e1 transition-all hover:opacity-90 active:scale-[0.97] cursor-pointer"
        >
          <Camera className="h-3.5 w-3.5" />
          <span>Scan barcode</span>
        </button>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {items.map((item) => {
          const retail = Number(item.retail_price ?? item.price ?? 0);
          const price = tier === 'wholesale' ? Number(item.wholesale_price ?? retail * 0.85) : retail;
          const state = stockState(item);

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onAdd(item)}
              className="shrink-0 rounded-[var(--radius-control)] bg-surface px-3 py-2 text-left ring-1 ring-hairline/70 transition-all hover:ring-[var(--color-brand)]/40 active:scale-[0.97] cursor-pointer"
            >
              <div className="max-w-[130px] truncate text-body font-bold text-ink">
                {item.item_name || item.name}
              </div>
              <div className="mt-0.5 text-micro">
                <Money value={price} className="font-extrabold" />
                <span className="ml-1 text-ink-subtle">({tier})</span>
              </div>
              {state !== 'ok' && (
                <div
                  className={`text-micro font-bold ${
                    state === 'out' ? 'text-[var(--color-danger)]' : 'text-[var(--color-warn)]'
                  }`}
                >
                  {state === 'out' ? 'Out of stock' : `Low · ${stockOf(item)} left`}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
