import React, { useState } from 'react';
import { X, Fuel, IndianRupee, FileText, Loader2, Wrench, Sparkles, Package, Store } from 'lucide-react';
import { useDashboard } from '../../context/DashboardContext';

// Quick-pick expense categories (the label is stored as party_name and
// duplicated into items_json so Reports can group by it later)
const EXPENSE_CATEGORIES = [
  { key: 'petrol', label: 'Petrol / Fuel', icon: Fuel, active: 'bg-amber-50 text-amber-600 border-amber-200' },
  { key: 'maintenance', label: 'Maintenance', icon: Wrench, active: 'bg-slate-50 text-slate-600 border-slate-200' },
  { key: 'utilities', label: 'Utilities', icon: Sparkles, active: 'bg-sky-50 text-sky-600 border-sky-200' },
  { key: 'rent', label: 'Rent', icon: Store, active: 'bg-violet-50 text-violet-600 border-violet-200' },
  { key: 'other', label: 'Other', icon: Package, active: 'bg-slate-50 text-slate-600 border-slate-200' }
];

export default function NewExpenseModal() {
  const { isAddExpenseOpen, setIsAddExpenseOpen, addExpense } = useDashboard();

  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('petrol');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isAddExpenseOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const amountNum = Number(amount);
    if (!amount || Number.isNaN(amountNum) || amountNum <= 0) {
      alert('Please enter a valid expense amount');
      return;
    }
    const desc = description.trim() || 'General Expense';

    setIsSubmitting(true);
    try {
      await addExpense({
        description: desc,
        amount: amountNum,
        category
      });
      setDescription('');
      setAmount('');
      setCategory('petrol');
      setIsAddExpenseOpen(false);
    } catch (err) {
      console.error(err);
      alert('Failed to record expense: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-xs p-0 sm:p-4 animate-fadeIn">
      <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-[#1E1B4B] text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <Fuel className="w-4 h-4" />
            </div>
            <div className="text-left">
              <h3 className="font-bold text-base leading-tight">Add Expense</h3>
              <p className="text-[11px] text-slate-300">Local-first · syncs like sales & purchases</p>
            </div>
          </div>
          <button
            onClick={() => setIsAddExpenseOpen(false)}
            className="p-1 rounded-lg text-slate-300 hover:text-white hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-left">
          {/* Category quick-picks */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Category
            </label>
            <div className="grid grid-cols-3 gap-2">
              {EXPENSE_CATEGORIES.map(cat => {
                const CatIcon = cat.icon;
                return (
                  <button
                    key={cat.key}
                    type="button"
                    onClick={() => setCategory(cat.key)}
                    className={`flex flex-col items-center gap-1 px-2 py-2.5 rounded-xl border text-[11px] font-semibold transition-all cursor-pointer ${
                      category === cat.key
                        ? `${cat.active} ring-2 ring-amber-400`
                        : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    <CatIcon className="w-4 h-4" />
                    <span>{cat.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Description
            </label>
            <div className="relative">
              <FileText className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder={category === 'petrol' ? 'e.g. Bike fuel for delivery run' : 'e.g. Monthly shop rent'}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium"
              />
            </div>
          </div>

          {/* Amount */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Amount (₹) <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <IndianRupee className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="number"
                step="any"
                min="0"
                required
                autoFocus
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-lg font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>

          {/* Note */}
          <div className="p-3 rounded-xl bg-amber-50 border border-amber-100 text-xs text-amber-900">
            <span className="font-semibold">Note:</span> Expenses reduce profit but stay separate from supplier
            payables — they won't inflate <strong>Total Payable</strong>.
          </div>

          {/* Actions */}
          <div className="pt-2 flex items-center gap-3">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => setIsAddExpenseOpen(false)}
              className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 font-semibold text-sm hover:bg-slate-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-3 rounded-xl bg-amber-500 hover:bg-amber-600 active:scale-95 text-white font-bold text-sm shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>Save Expense</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
