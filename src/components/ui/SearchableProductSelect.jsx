import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Search, PackageSearch, X } from 'lucide-react';
import Money from './Money';
import { FIELD, HINT, LABEL } from './controls';

// ---------------------------------------------------------------------------
// SearchableProductSelect — searchable dropdown for picking a product.
// Filters as you type (name / sku / barcode), keyboard navigable
// (↑/↓/Enter/Esc), shows price + stock per option.
// ---------------------------------------------------------------------------

export default function SearchableProductSelect({ products, value, onChange, isLoading, error }) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [highlighted, setHighlighted] = useState(0);
  const rootRef = useRef(null);
  const listRef = useRef(null);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const onDocDown = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setIsOpen(false);
    };
    document.addEventListener('mousedown', onDocDown);
    return () => document.removeEventListener('mousedown', onDocDown);
  }, [isOpen]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return products;
    return products.filter(p =>
      String(p.name || '').toLowerCase().includes(q) ||
      String(p.sku || '').toLowerCase().includes(q) ||
      String(p.barcode || '').includes(q)
    );
  }, [products, query]);

  // Keep highlight inside bounds when the list changes
  useEffect(() => {
    setHighlighted(h => Math.min(h, Math.max(0, filtered.length - 1)));
  }, [filtered.length]);

  // Scroll highlighted option into view
  useEffect(() => {
    if (!isOpen || !listRef.current) return;
    const el = listRef.current.children[highlighted];
    el?.scrollIntoView({ block: 'nearest' });
  }, [highlighted, isOpen]);

  const select = (p) => {
    onChange(p);
    setIsOpen(false);
    setQuery('');
  };

  return (
    <div ref={rootRef} className="relative">
      <span className={LABEL}>Product (optional)</span>

      {value ? (
        // Selected state — a chip with the way out
        <div className="flex items-center justify-between gap-2 rounded-[var(--radius-control)] bg-[var(--color-out)]/8 py-1.5 pl-3 pr-1.5 ring-1 ring-[var(--color-out)]/25">
          <div className="min-w-0 text-left">
            <p className="truncate text-body font-bold text-ink">{value.name}</p>
            <p className="num text-micro text-ink-muted">
              <Money value={value.price} tone="muted" className="text-micro" /> / {value.unit}
              {value.stock !== undefined && ` · stock ${value.stock}`}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onChange(null)}
            className="rounded-[var(--radius-control)] p-1.5 text-ink-subtle transition-colors hover:bg-[var(--color-out)]/10 hover:text-[var(--color-out)] cursor-pointer"
            title="Clear selection"
            aria-label="Clear selected product"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        // Closed trigger / search input
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-ink-subtle" />
          <input
            type="text"
            placeholder={isLoading ? 'Loading products…' : 'Type to search products…'}
            aria-label="Search products"
            value={query}
            onFocus={() => setIsOpen(true)}
            onChange={(e) => { setQuery(e.target.value); setIsOpen(true); setHighlighted(0); }}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') { e.preventDefault(); setHighlighted(h => Math.min(h + 1, filtered.length - 1)); }
              else if (e.key === 'ArrowUp') { e.preventDefault(); setHighlighted(h => Math.max(h - 1, 0)); }
              else if (e.key === 'Enter') { e.preventDefault(); if (filtered[highlighted]) select(filtered[highlighted]); }
              else if (e.key === 'Escape') { setIsOpen(false); setQuery(''); }
            }}
            className={`${FIELD} num pl-9`}
          />

          {isOpen && (
            <div className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-[var(--radius-card)] bg-surface py-1 text-left shadow-e3 ring-1 ring-hairline/70">
              {error ? (
                <p role="alert" className="px-3 py-3 text-micro text-[var(--color-danger)]">
                  Could not load products: {error}
                </p>
              ) : isLoading ? (
                <p className="px-3 py-3 text-micro text-ink-subtle">Loading products…</p>
              ) : filtered.length === 0 ? (
                <p className="flex items-center gap-2 px-3 py-3 text-micro text-ink-subtle">
                  <PackageSearch className="h-4 w-4" />
                  No matching products{query ? ` for “${query}”` : ' — add items first'}
                </p>
              ) : (
                <ul ref={listRef}>
                  {filtered.map((p, i) => (
                    <li key={p.id}>
                      <button
                        type="button"
                        onMouseEnter={() => setHighlighted(i)}
                        onClick={() => select(p)}
                        className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-left transition-colors cursor-pointer ${
                          i === highlighted ? 'bg-surface-2' : 'hover:bg-surface-2/60'
                        }`}
                      >
                        <div className="min-w-0">
                          <p className="truncate text-body font-bold text-ink">{p.name}</p>
                          {p.sku && <p className="num text-micro text-ink-subtle">SKU {p.sku}</p>}
                        </div>
                        <div className="shrink-0 text-right">
                          <Money value={p.price} tone="out" className="text-body" />
                          <p className="text-micro text-ink-subtle">/ {p.unit}</p>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
          <p className={HINT}>Leave this empty to record the bill without adding stock.</p>
        </div>
      )}
    </div>
  );
}
