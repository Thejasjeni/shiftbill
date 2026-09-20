import React, { useEffect, useMemo, useRef, useState } from 'react';
import { User, Users, ChevronDown, X } from 'lucide-react';

// Who the bill is for, and which price list it uses.
//
// The sheet owns the customer — name, phone and tier are what the invoice is
// written from — and this only shows how to pick one (open list, search text).
// The selected row is therefore derived from the committed name/phone, so
// nothing here can go stale behind the sheet's back.
export default function CustomerPicker({
  parties = [],
  vendors = [],
  name,
  phone,
  onNameChange,
  onPhoneChange,
  tier,
  onTierChange
}) {
  const [isListOpen, setIsListOpen] = useState(false);
  const [search, setSearch] = useState('');
  const listRef = useRef(null);

  // Local parties and registry customers in one list, deduped by name+phone.
  const savedCustomers = useMemo(() => {
    const fromParties = (parties || []).map((p) => ({
      key: `party-${p.id}`,
      name: p.name,
      phone: p.phone && p.phone !== '--' ? String(p.phone) : '',
      source: 'Party'
    }));
    const fromRegistry = (vendors || [])
      .filter((v) => v.type === 'customer')
      .map((v) => ({
        key: `vendor-${v.id}`,
        name: v.name,
        phone: v.phone ? String(v.phone) : '',
        source: 'Registry'
      }));

    const seen = new Set();
    return [...fromParties, ...fromRegistry].filter((c) => {
      if (!c.name) return false;
      const key = `${c.name.toLowerCase()}|${c.phone}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [parties, vendors]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return savedCustomers;
    return savedCustomers.filter((c) =>
      c.name.toLowerCase().includes(q) || String(c.phone).includes(q)
    );
  }, [savedCustomers, search]);

  useEffect(() => {
    if (!isListOpen) return;
    const onPointerDown = (event) => {
      if (listRef.current && !listRef.current.contains(event.target)) setIsListOpen(false);
    };
    const onKeyDown = (event) => { if (event.key === 'Escape') setIsListOpen(false); };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('touchstart', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('touchstart', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [isListOpen]);

  // The row that is currently committed, matched back to the saved list.
  const selected = useMemo(
    () => savedCustomers.find((c) => c.name === name && (!c.phone || c.phone === phone)) || null,
    [savedCustomers, name, phone]
  );

  const choose = (customer) => {
    onNameChange(customer.name);
    // Normalise to the 10-digit local format the WhatsApp field expects
    const digits = String(customer.phone || '').replace(/\D/g, '');
    onPhoneChange(digits.length >= 10 ? digits.slice(-10) : digits);
    setIsListOpen(false);
    setSearch('');
  };

  const clear = () => {
    onNameChange('');
    onPhoneChange('');
  };

  return (
    <div className="space-y-2.5 rounded-[var(--radius-card)] bg-surface-2 p-3 ring-1 ring-hairline/70">
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-micro font-bold text-ink-muted">
          <User className="h-3.5 w-3.5 text-[var(--color-brand)]" />
          <span>Customer</span>
        </span>

        <div
          role="group"
          aria-label="Price list"
          className="flex items-center rounded-[var(--radius-control)] bg-surface p-0.5 ring-1 ring-hairline/70"
        >
          {[
            { id: 'retail', label: 'Retail' },
            { id: 'wholesale', label: 'Wholesale' }
          ].map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => onTierChange(option.id)}
              aria-pressed={tier === option.id}
              className={`rounded-lg px-3 py-1 text-micro font-bold transition-all cursor-pointer ${
                tier === option.id
                  ? 'bg-[var(--color-brand)] text-white shadow-e1'
                  : 'text-ink-muted hover:text-ink'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* One tap instead of typing a name nobody spells consistently */}
      <div className="relative" ref={listRef}>
        <button
          type="button"
          onClick={() => setIsListOpen((open) => !open)}
          aria-haspopup="listbox"
          aria-expanded={isListOpen}
          className="flex w-full items-center justify-between gap-2 rounded-[var(--radius-control)] bg-surface px-3 py-1.5 text-micro font-medium ring-1 ring-hairline/70 transition-colors hover:ring-[var(--color-brand)]/40 cursor-pointer"
        >
          <span className="flex min-w-0 items-center gap-1.5">
            <Users className="h-3.5 w-3.5 shrink-0 text-[var(--color-brand)]" />
            {name?.trim() ? (
              <span className="truncate">
                <span className="font-bold text-ink">{name}</span>
                {phone && <span className="num text-ink-subtle"> · {phone}</span>}
              </span>
            ) : (
              <span className="text-ink-muted">Choose a saved customer</span>
            )}
          </span>
          {name?.trim() ? (
            <span
              role="button"
              tabIndex={0}
              onClick={(event) => { event.stopPropagation(); clear(); }}
              onKeyDown={(event) => {
                if (event.key === 'Enter') { event.stopPropagation(); clear(); }
              }}
              className="shrink-0 rounded p-0.5 text-ink-subtle transition-colors hover:bg-[var(--color-danger)]/10 hover:text-[var(--color-danger)] cursor-pointer"
              aria-label="Clear selected customer"
            >
              <X className="h-3.5 w-3.5" />
            </span>
          ) : (
            <ChevronDown
              className={`h-3.5 w-3.5 shrink-0 text-ink-subtle transition-transform ${isListOpen ? 'rotate-180' : ''}`}
            />
          )}
        </button>

        {isListOpen && (
          <div className="absolute left-0 right-0 z-30 mt-1 rounded-[var(--radius-card)] bg-surface py-1 shadow-e3 ring-1 ring-hairline/70">
            <div className="px-2 pb-1">
              <input
                type="text"
                autoFocus
                placeholder="Search customers…"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="w-full rounded-lg bg-surface-2 px-2.5 py-1.5 text-micro text-ink ring-1 ring-hairline/70 focus:outline-none focus:ring-[var(--color-brand)]/40"
              />
            </div>
            <div className="max-h-44 overflow-y-auto">
              {filtered.length === 0 ? (
                <p className="px-3 py-3 text-center text-micro text-ink-subtle">
                  No saved customers yet — add one under Parties.
                </p>
              ) : (
                filtered.map((customer) => (
                  <button
                    key={customer.key}
                    type="button"
                    onClick={() => choose(customer)}
                    className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-left transition-colors hover:bg-surface-2 cursor-pointer ${
                      selected?.key === customer.key ? 'bg-surface-2/70' : ''
                    }`}
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <User className="h-3.5 w-3.5 shrink-0 text-ink-subtle" />
                      <span className="min-w-0">
                        <span className="block truncate text-body font-semibold text-ink">{customer.name}</span>
                        {customer.phone && (
                          <span className="num block text-micro text-ink-subtle">{customer.phone}</span>
                        )}
                      </span>
                    </span>
                    <span className="shrink-0 rounded bg-surface-2 px-1.5 py-0.5 text-micro font-bold uppercase text-ink-muted">
                      {customer.source}
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Manual entry: pre-filled when a saved customer is chosen, editable when not */}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <input
          type="text"
          placeholder="Customer name (optional)"
          aria-label="Customer name"
          value={name}
          onChange={(event) => onNameChange(event.target.value)}
          className="rounded-[var(--radius-control)] bg-surface px-3 py-1.5 text-micro font-medium text-ink ring-1 ring-hairline/70 focus:outline-none focus:ring-[var(--color-brand)]/40"
        />
        <input
          type="tel"
          placeholder="WhatsApp number"
          aria-label="WhatsApp number"
          value={phone}
          onChange={(event) => onPhoneChange(event.target.value)}
          className="rounded-[var(--radius-control)] bg-surface px-3 py-1.5 text-micro font-medium text-ink ring-1 ring-hairline/70 focus:outline-none focus:ring-[var(--color-brand)]/40"
        />
      </div>
    </div>
  );
}
