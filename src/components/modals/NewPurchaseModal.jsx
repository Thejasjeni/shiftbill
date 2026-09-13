import React, { useState } from 'react';
import { X, ShoppingCart, IndianRupee, Building, Loader2 } from 'lucide-react';
import { useDashboard } from '../../context/DashboardContext';

export default function NewPurchaseModal() {
  const { isAddPurchaseOpen, setIsAddPurchaseOpen, addPurchase, isSupabaseConfigured } = useDashboard();

  const [supplierName, setSupplierName] = useState('');
  const [amount, setAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isAddPurchaseOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    // `amount` is a string from the input: validate with Number()
    const amountNum = Number(amount);
    if (!amount || Number.isNaN(amountNum) || amountNum <= 0) {
      alert("Please enter a valid purchase bill amount");
      return;
    }

    setIsSubmitting(true);
    try {
      await addPurchase({
        party_name: supplierName.trim() || 'General Supplier',
        amount: amountNum,
        type: 'purchase'
      });

      setSupplierName('');
      setAmount('');
      setIsAddPurchaseOpen(false);
    } catch (err) {
      console.error(err);
      alert("Failed to record purchase: " + err.message);
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
            <div className="w-8 h-8 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center">
              <ShoppingCart className="w-4 h-4" />
            </div>
            <div className="text-left">
              <h3 className="font-bold text-base leading-tight">Add Purchase Transaction</h3>
              <p className="text-[11px] text-slate-300">
                {isSupabaseConfigured ? 'Syncs directly to Supabase' : 'Stores in local session'}
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsAddPurchaseOpen(false)}
            className="p-1 rounded-lg text-slate-300 hover:text-white hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-left">
          {/* Supplier Name */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Supplier / Vendor Name
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Building className="w-4 h-4" />
              </div>
              <input
                type="text"
                placeholder="e.g. Krishna Wholesalers"
                value={supplierName}
                onChange={(e) => setSupplierName(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 font-medium"
              />
            </div>
          </div>

          {/* Amount Field */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Bill Amount (₹) <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <IndianRupee className="w-4 h-4" />
              </div>
              <input
                type="number"
                step="any"
                required
                autoFocus
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-lg font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>

          {/* Dynamic Calculation note */}
          <div className="p-3 rounded-xl bg-purple-50 border border-purple-100 text-xs text-purple-900">
            <span className="font-semibold">Note:</span> Adds a new <code>type = 'purchase'</code> row to <code>transactions</code> and updates <strong>Total Payable</strong>.
          </div>

          {/* Actions */}
          <div className="pt-2 flex items-center gap-3">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => setIsAddPurchaseOpen(false)}
              className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 font-semibold text-sm hover:bg-slate-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-3 rounded-xl bg-purple-600 hover:bg-purple-700 active:scale-95 text-white font-bold text-sm shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>Save Purchase</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
