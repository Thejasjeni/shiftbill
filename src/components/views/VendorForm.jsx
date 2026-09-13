import React, { useState } from 'react';
import { Building2, Phone, Loader2, Save, RefreshCw, AlertTriangle, CheckCircle2, UserCog } from 'lucide-react';
import { useVendors } from '../../hooks/useVendors';
import { isSupabaseConfigured } from '../../lib/supabaseClient';

// ---------------------------------------------------------------------------
// VendorForm — persistent vendor/client form (Name, GST No, Phone).
// Submissions insert into Supabase `vendors`; the list re-fetches on mount,
// so data persists across page refreshes.
// ---------------------------------------------------------------------------

const TYPE_OPTIONS = [
  { value: 'customer', label: 'Customer' },
  { value: 'supplier', label: 'Supplier / Vendor' }
];

const GST_RE = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9A-Z]Z[0-9A-Z]$/;

export default function VendorForm() {
  const { vendors, isLoading, error, isSaving, addVendor, refetch } = useVendors();

  const [name, setName] = useState('');
  const [gstNo, setGstNo] = useState('');
  const [phone, setPhone] = useState('');
  const [type, setType] = useState('customer');
  const [successMsg, setSuccessMsg] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});

  const validate = () => {
    const errs = {};
    if (!name.trim()) errs.name = 'Name is required';
    if (gstNo.trim() && !GST_RE.test(gstNo.trim().toUpperCase())) {
      errs.gstNo = 'Invalid GST format (e.g. 29AABCU9603R1ZM)';
    }
    if (phone.trim() && !/^[0-9+\-\s]{7,15}$/.test(phone.trim())) {
      errs.phone = 'Invalid phone number';
    }
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSuccessMsg(null);
    const errs = validate();
    setFieldErrors(errs);
    if (Object.keys(errs).length > 0) return;

    try {
      await addVendor({ name, gstNo, phone, type });
      setSuccessMsg(`${name.trim()} saved to Supabase`);
      setName(''); setGstNo(''); setPhone('');
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err) {
      setFieldErrors({ form: err.message || 'Failed to save vendor' });
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-4 sm:p-5 text-left">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
            <UserCog className="w-5 h-5 text-indigo-600" />
            Vendor / Client Registry
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Saved to Supabase — persists across refreshes
          </p>
        </div>
        <button
          type="button"
          onClick={refetch}
          disabled={isLoading}
          className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-indigo-600 cursor-pointer disabled:opacity-50"
          title="Refresh list"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {!isSupabaseConfigured && (
        <div className="mb-4 p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>Supabase is not configured — set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to enable saving.</span>
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>Load failed: {error}</span>
        </div>
      )}

      {successMsg && (
        <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-start gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{successMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3.5" noValidate>
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
            Name <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="e.g. Krishna Wholesalers"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={`w-full pl-9 pr-3 py-2 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${fieldErrors.name ? 'border-rose-400' : 'border-slate-200'}`}
            />
          </div>
          {fieldErrors.name && <p className="text-[11px] text-rose-600 mt-1">{fieldErrors.name}</p>}
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
            GST No
          </label>
          <input
            type="text"
            placeholder="e.g. 29AABCU9603R1ZM"
            value={gstNo}
            onChange={(e) => setGstNo(e.target.value.toUpperCase())}
            className={`w-full px-3 py-2 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${fieldErrors.gstNo ? 'border-rose-400' : 'border-slate-200'}`}
          />
          {fieldErrors.gstNo && <p className="text-[11px] text-rose-600 mt-1">{fieldErrors.gstNo}</p>}
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
            Phone Number
          </label>
          <div className="relative">
            <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="tel"
              placeholder="e.g. +91 98765 43210"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className={`w-full pl-9 pr-3 py-2 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${fieldErrors.phone ? 'border-rose-400' : 'border-slate-200'}`}
            />
          </div>
          {fieldErrors.phone && <p className="text-[11px] text-rose-600 mt-1">{fieldErrors.phone}</p>}
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Type</label>
          <div className="grid grid-cols-2 gap-2">
            {TYPE_OPTIONS.map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setType(opt.value)}
                className={`py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                  type === opt.value
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {fieldErrors.form && (
          <p className="text-[11px] text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">{fieldErrors.form}</p>
        )}

        <button
          type="submit"
          disabled={isSaving || !isSupabaseConfigured}
          className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] disabled:opacity-60 text-white font-bold text-sm shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
        >
          {isSaving ? (
            <><Loader2 className="w-4 h-4 animate-spin" /><span>Saving...</span></>
          ) : (
            <><Save className="w-4 h-4" /><span>Save Vendor / Client</span></>
          )}
        </button>
      </form>

      {/* Saved list — proof of persistence (fetched on mount) */}
      <div className="mt-5 pt-4 border-t border-slate-100">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
          Saved Vendors ({vendors.length})
        </h3>
        {isLoading ? (
          <p className="text-xs text-slate-400 py-3 text-center">Loading from Supabase...</p>
        ) : vendors.length === 0 ? (
          <p className="text-xs text-slate-400 py-3 text-center">No vendors saved yet</p>
        ) : (
          <ul className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
            {vendors.map(v => (
              <li key={v.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-50 text-xs">
                <div className="min-w-0">
                  <span className="font-semibold text-slate-800 truncate block">{v.name}</span>
                  <span className="text-slate-400">{v.phone || 'no phone'}{v.gst_no ? ` · ${v.gst_no}` : ''}</span>
                </div>
                <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded shrink-0 ml-2 ${
                  v.type === 'supplier' ? 'bg-purple-100 text-purple-700' : 'bg-indigo-100 text-indigo-700'
                }`}>
                  {v.type}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
