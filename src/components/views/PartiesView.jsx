import React, { useState } from 'react';
import { Users, Plus, Phone, Search, FileText, X, UserPlus, Building2 } from 'lucide-react';
import { useDashboard } from '../../context/DashboardContext';
import VendorForm from './VendorForm';
import Badge from '../ui/Badge';
import EmptyState from '../ui/EmptyState';
import Money from '../ui/Money';
import Surface from '../ui/Surface';
import { BUTTON, DIALOG, FIELD, LABEL } from '../ui/controls';

export default function PartiesView() {
  const { currentData, setActiveReportModal, addParty } = useDashboard();
  const [filterType, setFilterType] = useState('All');
  const [search, setSearch] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isVendorRegistryOpen, setIsVendorRegistryOpen] = useState(false);

  // New party form state
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [type, setType] = useState('Customer');
  const [openingBalance, setOpeningBalance] = useState('');

  const handleCreateParty = (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    // Sign convention: positive = receivable (customer owes you),
    // negative = payable (you owe the supplier). Display uses Math.abs().
    const balanceNum = Number(openingBalance || 0) || 0;
    addParty({
      name: name.trim(),
      phone: phone.trim() || '--',
      type: type,
      balance: type === 'Customer' ? balanceNum : -balanceNum
    });

    setName('');
    setPhone('');
    setOpeningBalance('');
    setIsAddModalOpen(false);
  };

  const filtered = currentData.parties.filter(p => {
    if (filterType === 'Customers' && p.type !== 'Customer') return false;
    if (filterType === 'Suppliers' && p.type !== 'Supplier') return false;
    const s = search.toLowerCase();
    return String(p.name || '').toLowerCase().includes(s) ||
      String(p.phone || '').includes(search);
  });

  return (
    <div className="space-y-4 text-left">
      {/* Header */}
      <Surface className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-title font-bold text-ink">Parties &amp; ledgers</h1>
          <p className="text-micro text-ink-muted">Customers, suppliers and what each side still owes</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsVendorRegistryOpen(o => !o)}
            aria-expanded={isVendorRegistryOpen}
            className={isVendorRegistryOpen ? BUTTON.primary : BUTTON.secondary}
          >
            <Building2 className="h-4 w-4" />
            <span>Vendor registry</span>
          </button>
          <button onClick={() => setIsAddModalOpen(true)} className={BUTTON.primary}>
            <Plus className="h-4 w-4" />
            <span>Add party</span>
          </button>
        </div>
      </Surface>

      {/* Firestore-backed Vendor/Client Registry (collapsible) */}
      {isVendorRegistryOpen && (
        <VendorForm />
      )}

      {/* Filter Tabs & Search */}
      <div className="flex flex-col items-center gap-3 sm:flex-row">
        <div className="flex w-full rounded-[var(--radius-control)] bg-surface-2 p-1 ring-1 ring-hairline/60 sm:w-auto">
          {['All', 'Customers', 'Suppliers'].map((tab) => (
            <button
              key={tab}
              onClick={() => setFilterType(tab)}
              aria-pressed={filterType === tab}
              className={`flex-1 rounded-lg px-4 py-1.5 text-micro font-bold transition-all cursor-pointer sm:flex-none ${
                filterType === tab ? 'bg-surface text-ink shadow-e1' : 'text-ink-muted hover:text-ink'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
        <div className="relative w-full sm:flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-ink-subtle" />
          <input
            type="text"
            placeholder="Search parties by name or mobile…"
            aria-label="Search parties"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={`${FIELD} pl-9`}
          />
        </div>
      </div>

      {/* Party Cards List */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {filtered.length === 0 ? (
          <Surface padding="none" className="col-span-full">
            <EmptyState
              icon={Users}
              title={currentData.parties.length === 0 ? 'No parties yet' : 'Nothing matches that search'}
              hint={
                currentData.parties.length === 0
                  ? 'Add the customers and suppliers you deal with, so bills and payments can be tracked against them.'
                  : 'Try a different name or mobile number.'
              }
              action={
                currentData.parties.length === 0 ? (
                  <button onClick={() => setIsAddModalOpen(true)} className={BUTTON.quiet}>
                    + Add the first party
                  </button>
                ) : null
              }
            />
          </Surface>
        ) : (
          filtered.map(party => {
            const owesYou = party.balance > 0;
            const youOwe = party.balance < 0;
            return (
              <Surface
                key={party.id}
                padding="md"
                className="flex cursor-pointer flex-col justify-between transition-shadow hover:shadow-e2 hover:ring-[var(--color-brand)]/30"
                onClick={() => setActiveReportModal({ id: 'party-statement', title: `Party Statement: ${party.name}` })}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-body font-bold text-ink">{party.name}</span>
                      <Badge tone={party.type === 'Supplier' ? 'out' : 'neutral'}>{party.type}</Badge>
                    </div>
                    <div className="num mt-1 flex items-center gap-1.5 text-micro text-ink-muted">
                      <Phone className="h-3 w-3 text-ink-subtle" />
                      <span>{party.phone}</span>
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="text-micro font-medium text-ink-subtle">
                      {owesYou ? 'To collect' : youOwe ? 'To pay' : 'Settled'}
                    </div>
                    <Money
                      value={Math.abs(party.balance || 0)}
                      tone={owesYou ? 'in' : youOwe ? 'out' : 'muted'}
                      className="text-title font-extrabold"
                    />
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-hairline/60 pt-3 text-micro font-semibold text-[var(--color-brand)]">
                  <span>View full statement</span>
                  <FileText className="h-4 w-4" />
                </div>
              </Surface>
            );
          })
        )}
      </div>

      {/* Add Party Modal Dialog */}
      {isAddModalOpen && (
        <div className={DIALOG.overlay} onClick={() => setIsAddModalOpen(false)}>
          <div className={`${DIALOG.card} max-w-md`} onClick={(e) => e.stopPropagation()}>
            <div className={DIALOG.header}>
              <div className="flex items-center gap-2">
                <UserPlus className={DIALOG.icon} />
                <h3 className={DIALOG.title}>Add party</h3>
              </div>
              <button onClick={() => setIsAddModalOpen(false)} className={DIALOG.close} aria-label="Close">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateParty} className={DIALOG.body}>
              <div>
                <label className={LABEL} htmlFor="party-name">Party name *</label>
                <input
                  id="party-name"
                  type="text"
                  required
                  placeholder="e.g. Ramesh Kumar"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={FIELD}
                />
              </div>

              <div>
                <label className={LABEL} htmlFor="party-phone">Mobile / phone number</label>
                <input
                  id="party-phone"
                  type="tel"
                  placeholder="e.g. 98765 43210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className={`${FIELD} num`}
                />
              </div>

              <div>
                <span className={LABEL}>Party type</span>
                <div className="grid grid-cols-2 gap-2">
                  {['Customer', 'Supplier'].map(t => (
                    <button
                      type="button"
                      key={t}
                      onClick={() => setType(t)}
                      aria-pressed={type === t}
                      className={`rounded-[var(--radius-control)] py-2 text-body font-bold ring-1 transition-all cursor-pointer ${
                        type === t
                          ? 'bg-[var(--color-brand)] text-white ring-[var(--color-brand)]'
                          : 'bg-surface-2 text-ink-muted ring-hairline/70 hover:text-ink'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className={LABEL} htmlFor="party-balance">Opening balance (₹)</label>
                <input
                  id="party-balance"
                  type="number"
                  placeholder="0.00"
                  value={openingBalance}
                  onChange={(e) => setOpeningBalance(e.target.value)}
                  className={`${FIELD} num`}
                />
              </div>

              <div className={DIALOG.footer}>
                <button type="button" onClick={() => setIsAddModalOpen(false)} className={`${BUTTON.secondary} flex-1`}>
                  Cancel
                </button>
                <button type="submit" className={`${BUTTON.primary} flex-1`}>
                  Save party
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
