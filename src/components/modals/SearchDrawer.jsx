import React, { useState } from 'react';
import { X, Search, User, Package, ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { useDashboard } from '../../context/DashboardContext';

export default function SearchDrawer() {
  const { isSearchOpen, setIsSearchOpen, currentData, setActiveReportModal } = useDashboard();
  const [query, setQuery] = useState('');

  if (!isSearchOpen) return null;

  const q = query.toLowerCase();

  const nameOf = (p) => p.name || p.party_name || '';
  const itemNameOf = (i) => i.name || i.item_name || '';
  const itemCodeOf = (i) => i.code || i.barcode || '';
  const partyOf = (tx) => tx.party_name || tx.partyName || (tx.type === 'sale' ? 'Cash Customer' : 'Supplier');

  const filteredParties = currentData.parties.filter(p =>
    nameOf(p).toLowerCase().includes(q) ||
    String(p.phone || '').toLowerCase().includes(q)
  );
  const filteredItems = currentData.items.filter(i =>
    itemNameOf(i).toLowerCase().includes(q) ||
    itemCodeOf(i).toLowerCase().includes(q)
  );
  const filteredTx = currentData.transactions.filter(t =>
    partyOf(t).toLowerCase().includes(q) ||
    String(t.id).toLowerCase().includes(q)
  );

  const hasAnyResults = filteredParties.length + filteredItems.length + filteredTx.length > 0;

  const close = () => {
    setIsSearchOpen(false);
    setQuery('');
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-6 animate-fadeIn"
      onClick={close}
    >
      <div
        className="bg-white w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden mt-6 flex flex-col max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Bar Input */}
        <div className="p-4 border-b border-slate-100 flex items-center gap-3">
          <Search className="w-5 h-5 text-indigo-600 shrink-0" />
          <input
            type="text"
            autoFocus
            placeholder="Search parties, items, invoices..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full text-sm sm:text-base font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none"
          />
          <button
            onClick={close}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Results */}
        <div className="p-4 overflow-y-auto space-y-4 text-left">
          {/* Transactions */}
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">Transactions</div>
            {filteredTx.length === 0 ? (
              <p className="text-xs text-slate-400">No transactions found</p>
            ) : (
              <div className="space-y-1">
                {filteredTx.slice(0, 6).map(t => {
                  const isSale = t.type === 'sale';
                  return (
                    <div
                      key={t.id}
                      onClick={() => {
                        close();
                        setActiveReportModal({ id: 'all-transactions', title: `Transaction: ${partyOf(t)}` });
                      }}
                      className="flex items-center justify-between p-2.5 rounded-xl hover:bg-indigo-50/60 cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${isSale ? 'bg-emerald-100 text-emerald-700' : 'bg-purple-100 text-purple-700'}`}>
                          {isSale ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                        </div>
                        <div>
                          <span className="text-xs sm:text-sm font-semibold text-slate-800">{partyOf(t)}</span>
                          <span className="text-[10px] text-slate-400 ml-2 font-mono">{String(t.id).slice(0, 12)}</span>
                        </div>
                      </div>
                      <span className={`text-xs font-semibold ${isSale ? 'text-emerald-600' : 'text-purple-700'}`}>
                        {isSale ? '+' : '-'}₹{Number(t.amount || 0).toLocaleString('en-IN')}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Parties */}
          <div className="pt-2 border-t border-slate-100">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">Parties</div>
            {filteredParties.length === 0 ? (
              <p className="text-xs text-slate-400">No parties found</p>
            ) : (
              <div className="space-y-1">
                {filteredParties.map(p => (
                  <div
                    key={p.id}
                    onClick={() => {
                      close();
                      setActiveReportModal({ id: 'party-statement', title: `Party Statement: ${nameOf(p)}` });
                    }}
                    className="flex items-center justify-between p-2.5 rounded-xl hover:bg-indigo-50/60 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center">
                        <User className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-xs sm:text-sm font-semibold text-slate-800">{nameOf(p)}</span>
                        <span className="text-[10px] text-slate-400 ml-2">{p.phone || '--'}</span>
                      </div>
                    </div>
                    <span className="text-xs font-semibold text-slate-600">₹{Number(p.balance || 0).toLocaleString('en-IN')}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Items */}
          <div className="pt-2 border-t border-slate-100">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">Inventory Items</div>
            {filteredItems.length === 0 ? (
              <p className="text-xs text-slate-400">No items found</p>
            ) : (
              <div className="space-y-1">
                {filteredItems.map(i => (
                  <div
                    key={i.id}
                    className="flex items-center justify-between p-2.5 rounded-xl hover:bg-emerald-50/60 transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                        <Package className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-xs sm:text-sm font-semibold text-slate-800">{itemNameOf(i)}</span>
                        <span className="text-[10px] text-slate-400 ml-2 font-mono">({itemCodeOf(i)})</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-bold text-slate-800">₹{Number(i.retail_price || i.price || 0).toLocaleString('en-IN')}</div>
                      <div className="text-[10px] text-slate-400">Stock: {i.stock ?? i.stock_quantity ?? 0} {i.unit || ''}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Global empty state */}
          {!hasAnyResults && query.trim() !== '' && (
            <div className="pt-3 text-center text-xs text-slate-400">
              No results for “{query}”. Try a party name, item name, or invoice ID.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
