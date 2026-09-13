import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Search, PackageSearch, X } from 'lucide-react';

// ---------------------------------------------------------------------------
// SearchableProductSelect — searchable dropdown for picking a product.
// Filters as you type (name / sku / barcode), keyboard navigable
// (↑/↓/Enter/Esc), shows purchase price + stock per option.
// ---------------------------------------------------------------------------

export default function SearchableProductSelect({ products, value, onChange, isLoading, error }) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [highlighted, setHighlighted] = useState(0);
  const rootRef = useRef(null);
  const listRef = useRef(null);

  // Close on outside click / Escape
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

  const inputDisplay = value ? `${value.name}${value.sku ? ` (${value.sku})` : ''}` : '';

  return (
    <div ref={rootRef} className="relative">
      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
        Product (from database) <span className="text-rose-500">*</span>
      </label>

      {value ? (
        // Selected state — chip with clear button
        <div className="flex items-center justify-between pl-3 pr-1.5 py-1.5 rounded-xl border border-purple-300 bg-purple-50">
          <div className="min-w-0 text-left">
            <p className="text-sm font-bold text-purple-900 truncate">{value.name}</p>
            <p className="text-[11px] text-purple-600">
              Retail ₹{Number(value.price || 0).toFixed(2)} / {value.unit}
              {value.stock !== undefined && ` · stock ${value.stock}`}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onChange(null)}
            className="p-1.5 rounded-lg text-purple-500 hover:bg-purple-100 cursor-pointer"
            title="Clear selection"
          >
            <X className="w-4 h-4" />
          </button>
          <input type="hidden" value={value.id} />
        </div>
    ) : (
      // Closed trigger / search input
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
        <input
          type="text"
          placeholder={isLoading ? 'Loading products...' : 'Type to search products...'}
          value={query}
          onFocus={() => setIsOpen(true)}
          onChange={(e) => { setQuery(e.target.value); setIsOpen(true); setHighlighted(0); }}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') { e.preventDefault(); setHighlighted(h => Math.min(h + 1, filtered.length - 1)); }
            else if (e.key === 'ArrowUp') { e.preventDefault(); setHighlighted(h => Math.max(h - 1, 0)); }
            else if (e.key === 'Enter') { e.preventDefault(); if (filtered[highlighted]) select(filtered[highlighted]); }
            else if (e.key === 'Escape') { setIsOpen(false); setQuery(''); }
          }}
          className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
        />

        {isOpen && (
          <div className="absolute z-20 mt-1 w-full max-h-56 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-lg text-left">
            {error ? (
              <p className="px-3 py-3 text-xs text-rose-600">Failed to load products: {error}</p>
            ) : isLoading ? (
              <p className="px-3 py-3 text-xs text-slate-400">Loading products from Supabase...</p>
            ) : filtered.length === 0 ? (
              <p className="px-3 py-3 text-xs text-slate-400 flex items-center gap-2">
                <PackageSearch className="w-4 h-4" />
                No matching products{query ? ` for "${query}"` : ' — add items first'}
              </p>
            ) : (
              <ul ref={listRef}>
                {filtered.map((p, i) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      onMouseEnter={() => setHighlighted(i)}
                      onClick={() => select(p)}
                      className={`w-full px-3 py-2 flex items-center justify-between gap-2 text-left text-xs cursor-pointer ${
                        i === highlighted ? 'bg-purple-50' : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="min-w-0">
                        <p className="font-bold text-slate-800 truncate">{p.name}</p>
                        {p.sku && <p className="text-slate-400 text-[11px]">SKU {p.sku}</p>}
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-bold text-purple-700">₹{Number(p.price || 0).toFixed(2)}</p>
                        <p className="text-slate-400 text-[11px]">/ {p.unit}</p>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    )}
  </div>
  );
}
