import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Search, CornerDownLeft, ReceiptText, Package, Users, FileBarChart, Fuel, ArrowDownLeft, ArrowUpRight
} from 'lucide-react';
import { useDashboard } from '../context/DashboardContext';
import { useCommandPalette } from '../hooks/useCommandPalette';

// The app's search and its quick actions in one surface, reachable from
// anywhere with ⌘K / Ctrl+K. Every row either navigates or performs the action
// directly, so the header can stay free of extra buttons.
export default function CommandPalette() {
  const {
    isSearchOpen, setIsSearchOpen,
    setIsCheckoutOpen, setIsAddPurchaseOpen, setIsAddExpenseOpen,
    setActiveNavTab, setActiveReportModal, currentData
  } = useDashboard();

  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  const open = useMemo(() => () => setIsSearchOpen(true), [setIsSearchOpen]);
  useCommandPalette(open);

  const close = () => {
    setIsSearchOpen(false);
    setQuery('');
    setActive(0);
  };

  useEffect(() => {
    if (isSearchOpen) setTimeout(() => inputRef.current?.focus(), 30);
  }, [isSearchOpen]);

  const needle = query.trim().toLowerCase();

  const rows = useMemo(() => {
    const commands = [
      { id: 'new-sale', label: 'New sale', hint: 'Open the POS', icon: ReceiptText, run: () => setIsCheckoutOpen(true) },
      { id: 'new-purchase', label: 'Add purchase bill', hint: 'Stock in', icon: Package, run: () => setIsAddPurchaseOpen(true) },
      { id: 'new-expense', label: 'Record expense', hint: 'Petrol, rent, etc.', icon: Fuel, run: () => setIsAddExpenseOpen(true) },
      { id: 'nav-home', label: 'Go to Home', icon: ArrowDownLeft, run: () => setActiveNavTab('home') },
      { id: 'nav-items', label: 'Go to Items', icon: Package, run: () => setActiveNavTab('items') },
      { id: 'nav-parties', label: 'Go to Parties', icon: Users, run: () => setActiveNavTab('parties') },
      { id: 'nav-settings', label: 'Go to Settings', icon: Users, run: () => setActiveNavTab('settings') },
      { id: 'report-sale', label: 'Sale Report', hint: 'Sales, tax, receivables', icon: FileBarChart, run: () => setActiveReportModal({ id: 'sale-report', title: 'Sale Report' }) },
      { id: 'report-all', label: 'All Transactions', hint: 'Every bill and payment', icon: FileBarChart, run: () => setActiveReportModal({ id: 'all-transactions', title: 'All Transactions Log' }) },
      { id: 'report-daybook', label: 'Daybook Report', hint: 'Daily cash movement', icon: FileBarChart, run: () => setActiveReportModal({ id: 'daybook-report', title: 'Daybook Report' }) }
    ];

    if (!needle) {
      return commands.map((c) => ({ ...c, kind: 'action' }));
    }

    const actions = commands.filter((c) =>
      c.label.toLowerCase().includes(needle) || (c.hint || '').toLowerCase().includes(needle)
    );
    const items = currentData.items
      .filter((i) => `${i.name || i.item_name || ''} ${i.code || i.barcode || ''}`.toLowerCase().includes(needle))
      .slice(0, 4)
      .map((i) => ({
        id: `item-${i.id}`,
        kind: 'item',
        label: i.name || i.item_name,
        hint: 'Add to a sale',
        icon: Package,
        run: () => setIsCheckoutOpen(true)
      }));
    const parties = currentData.parties
      .filter((p) => `${p.name || p.party_name || ''} ${p.phone || ''}`.toLowerCase().includes(needle))
      .slice(0, 4)
      .map((p) => ({
        id: `party-${p.id}`,
        kind: 'party',
        label: p.name || p.party_name,
        hint: p.phone || 'Party',
        icon: Users,
        run: () => setActiveNavTab('parties')
      }));
    const transactions = currentData.transactions
      .filter((t) => `${t.party_name || ''} ${t.id}`.toLowerCase().includes(needle))
      .slice(0, 4)
      .map((t) => ({
        id: `tx-${t.id}`,
        kind: 'transaction',
        label: t.party_name || (t.type === 'sale' ? 'Cash Customer' : 'Supplier'),
        hint: `${t.type} · ${String(t.id).slice(0, 8)}`,
        icon: t.type === 'sale' ? ArrowDownLeft : ArrowUpRight,
        run: () => setActiveReportModal({ id: 'all-transactions', title: `Transaction ${t.id}` })
      }));

    return [...actions, ...items, ...parties, ...transactions];
  }, [
    needle, currentData.items, currentData.parties, currentData.transactions,
    setIsCheckoutOpen, setIsAddPurchaseOpen, setIsAddExpenseOpen, setActiveNavTab, setActiveReportModal
  ]);

  // The highlight resets in the change handler, not in an effect — an effect
  // here would render twice for every keystroke.
  const onQueryChange = (event) => {
    setQuery(event.target.value);
    setActive(0);
  };

  if (!isSearchOpen) return null;

  const runRow = (row) => { close(); row?.run(); };

  const onKeyDown = (event) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActive((i) => Math.min(i + 1, rows.length - 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      runRow(rows[active]);
    } else if (event.key === 'Escape') {
      close();
    }
  };

  return (
    <div
      role="presentation"
      onClick={close}
      className="fixed inset-0 z-50 flex items-start justify-center bg-scrim p-3 backdrop-blur-sm animate-fadeIn sm:p-6"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Search and quick actions"
        onClick={(e) => e.stopPropagation()}
        className="mt-6 flex max-h-[80vh] w-full max-w-xl flex-col overflow-hidden rounded-[var(--radius-card)] bg-surface ring-1 ring-hairline/70 shadow-e3"
      >
        <div className="flex items-center gap-2.5 border-b border-hairline/70 px-4 py-3">
          <Search className="h-4 w-4 shrink-0 text-ink-subtle" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={onQueryChange}
            onKeyDown={onKeyDown}
            placeholder="Find an item, party or bill — or run a command…"
            aria-label="Search and quick actions"
            className="w-full bg-transparent text-body text-ink placeholder:text-ink-subtle focus:outline-none"
          />
          <kbd className="num hidden rounded-md bg-surface-2 px-1.5 py-0.5 text-micro text-ink-muted ring-1 ring-hairline/70 sm:block">
            esc
          </kbd>
        </div>

        <ul ref={listRef} className="overflow-y-auto p-2">
          {rows.length === 0 ? (
            <li className="px-3 py-10 text-center text-body text-ink-subtle">
              Nothing matches “{query}”
            </li>
          ) : (
            rows.map((row, index) => {
              const Icon = row.icon;
              const isActive = index === active;
              return (
                <li key={row.id}>
                  <button
                    type="button"
                    onMouseEnter={() => setActive(index)}
                    onClick={() => runRow(row)}
                    className={`flex w-full items-center gap-3 rounded-[var(--radius-control)] px-3 py-2.5 text-left transition-colors cursor-pointer ${
                      isActive ? 'bg-surface-2' : 'hover:bg-surface-2/60'
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0 text-ink-muted" />
                    <span className="flex-1 truncate text-body text-ink">{row.label}</span>
                    {row.hint && <span className="num text-micro text-ink-subtle">{row.hint}</span>}
                    {isActive && <CornerDownLeft className="h-3.5 w-3.5 shrink-0 text-ink-subtle" />}
                  </button>
                </li>
              );
            })
          )}
        </ul>
      </div>
    </div>
  );
}
