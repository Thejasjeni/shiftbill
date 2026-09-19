import React, { useState } from 'react';
import { Users, Plus, Phone, Search, FileText, X, UserPlus, Building2 } from 'lucide-react';
import { useDashboard } from '../../context/DashboardContext';
import VendorForm from './VendorForm';

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

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(Math.abs(val || 0));
  };

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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-slate-900">Parties & Ledgers</h1>
          <p className="text-xs text-slate-500">Manage customers, suppliers and outstanding balances</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsVendorRegistryOpen(o => !o)}
            className={`flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold shadow-xs cursor-pointer border transition-all ${
              isVendorRegistryOpen
                ? 'bg-indigo-600 text-white border-indigo-600'
                : 'bg-white text-indigo-700 border-indigo-200 hover:bg-indigo-50'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Vendor Registry</span>
          </button>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center justify-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs sm:text-sm font-semibold shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Party</span>
          </button>
        </div>
      </div>

      {/* Firestore-backed Vendor/Client Registry (collapsible) */}
      {isVendorRegistryOpen && (
        <VendorForm />
      )}

      {/* Filter Tabs & Search */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="flex bg-slate-200/70 p-1 rounded-xl w-full sm:w-auto">
          {['All', 'Customers', 'Suppliers'].map((tab) => (
            <button
              key={tab}
              onClick={() => setFilterType(tab)}
              className={`flex-1 sm:flex-none px-4 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                filterType === tab ? 'bg-white text-indigo-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
        <div className="relative w-full sm:flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search parties by name or mobile..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-white rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Party Cards List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {filtered.length === 0 ? (
          <div className="col-span-full py-12 text-center text-slate-400 bg-white rounded-2xl border border-slate-200/80">
            <Users className="w-10 h-10 mx-auto text-slate-300 stroke-1" />
            <p className="text-sm font-semibold text-slate-600 mt-2">No parties added yet</p>
            <p className="text-xs text-slate-400 mt-0.5">Click "Add Party" above or create an invoice to record customers</p>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="mt-3 px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-xs font-semibold cursor-pointer"
            >
              + Create First Party
            </button>
          </div>
        ) : (
          filtered.map(party => {
            const owesYou = party.balance > 0;
            const youOwe = party.balance < 0;
            return (
              <div
                key={party.id}
                onClick={() => setActiveReportModal({ id: 'party-statement', title: `Party Statement: ${party.name}` })}
                className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md hover:border-indigo-200 transition-all cursor-pointer flex flex-col justify-between"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm sm:text-base text-slate-900">{party.name}</span>
                      <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                        {party.type}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1">
                      <Phone className="w-3 h-3 text-slate-400" />
                      <span>{party.phone}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[11px] text-slate-400 font-medium">
                      {owesYou ? 'Receivable' : youOwe ? 'Payable' : 'Settled'}
                    </div>
                    <div className={`text-base font-extrabold ${
                      owesYou ? 'text-emerald-600' : youOwe ? 'text-purple-600' : 'text-slate-700'
                    }`}>
                      {formatCurrency(party.balance)}
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-indigo-600 font-semibold">
                  <span>View Full Statement</span>
                  <FileText className="w-4 h-4 text-indigo-500" />
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add Party Modal Dialog */}
      {isAddModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 animate-fadeIn"
          onClick={() => setIsAddModalOpen(false)}
        >
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="bg-[#1E1B4B] text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-indigo-300" />
                <h3 className="font-bold text-base">Add New Party</h3>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 rounded-lg text-slate-300 hover:text-white hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateParty} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Party Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Kumar"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Mobile / Phone Number</label>
                <input
                  type="tel"
                  placeholder="e.g. +91 98765 43210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Party Type</label>
                <div className="grid grid-cols-2 gap-2">
                  {['Customer', 'Supplier'].map(t => (
                    <button
                      type="button"
                      key={t}
                      onClick={() => setType(t)}
                      className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                        type === t
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Opening Balance (₹)</label>
                <input
                  type="number"
                  placeholder="0.00"
                  value={openingBalance}
                  onChange={(e) => setOpeningBalance(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="pt-2 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-semibold text-xs hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md cursor-pointer"
                >
                  Save Party
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
