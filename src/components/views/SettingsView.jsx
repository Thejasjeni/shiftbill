import React from 'react';
import { Building2 } from 'lucide-react';
import { useDashboard } from '../../context/DashboardContext';

export default function SettingsView() {
  const { businessInfo, setBusinessInfo, setIsUpgradeModalOpen } = useDashboard();

  return (
    <div className="space-y-4 max-w-3xl text-left">
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <h1 className="text-lg sm:text-xl font-bold text-slate-900">Business & App Settings</h1>
        <p className="text-xs text-slate-500">Configure business profile, GST details, print templates & backup</p>
      </div>

      {/* Business Details Form */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
        <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
          <Building2 className="w-4 h-4 text-indigo-600" />
          <span>Business Profile</span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Company / Store Name</label>
            <input
              type="text"
              value={businessInfo.name}
              onChange={(e) => setBusinessInfo({ ...businessInfo, name: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">GSTIN</label>
            <input
              type="text"
              value={businessInfo.gstin}
              onChange={(e) => setBusinessInfo({ ...businessInfo, gstin: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none font-mono uppercase"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Phone Number (WhatsApp)</label>
            <input
              type="text"
              value={businessInfo.phone || ''}
              onChange={(e) => setBusinessInfo({ ...businessInfo, phone: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none font-medium"
              placeholder="e.g. 9495385472"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Merchant UPI ID (for QR Code)</label>
            <input
              type="text"
              value={businessInfo.upiId || ''}
              onChange={(e) => setBusinessInfo({ ...businessInfo, upiId: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none font-mono"
              placeholder="e.g. jaggusts@okhdfcbank"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-600 mb-1">Location / Address</label>
            <input
              type="text"
              value={businessInfo.city}
              onChange={(e) => setBusinessInfo({ ...businessInfo, city: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none font-medium"
            />
          </div>
        </div>

        {/* Bill money block: both default to 0, so bills stay at the cart total */}
        <div className="pt-1 border-t border-slate-100">
          <h3 className="mt-3 text-xs font-bold text-slate-700 uppercase tracking-wider">Bill Totals</h3>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Leave both at 0 and every bill is simply its cart total.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Discount on every bill (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.5"
                value={businessInfo.discountPercent ?? 0}
                onChange={(e) => setBusinessInfo({ ...businessInfo, discountPercent: Number(e.target.value) || 0 })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none font-medium"
              />
              <p className="text-[11px] text-slate-400 mt-1">Taken off the sub total before the bill total.</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">GST rate (%)</label>
              <input
                type="number"
                min="0"
                max="28"
                step="0.5"
                value={businessInfo.taxRate ?? 0}
                onChange={(e) => setBusinessInfo({ ...businessInfo, taxRate: Number(e.target.value) || 0 })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none font-medium"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Shown as the GST already included in your prices — it never changes the amount collected.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Open Source License & Data Privacy Card */}
      <div className="bg-gradient-to-br from-[#1E1B4B] via-indigo-950 to-slate-900 text-white p-5 rounded-2xl shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border border-indigo-800/40">
        <div className="flex items-center gap-3.5">
          <img
            src="/logo.png"
            alt="SwiftBill"
            className="w-12 h-12 rounded-xl object-contain ring-2 ring-white/20 shadow-md"
          />
          <div>
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold tracking-wider mb-1 border border-emerald-500/30">
              MIT LICENSE • 100% FREE & OPEN SOURCE
            </div>
            <h3 className="text-base font-bold">SwiftBill Community Edition</h3>
            <p className="text-xs text-indigo-200 mt-0.5">
              No subscriptions, no hidden limits. Your data stays 100% local and private on your device.
            </p>
          </div>
        </div>
        <button
          onClick={() => alert("SwiftBill is free forever! You can contribute code, report bugs, or star the project on GitHub.")}
          className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md cursor-pointer shrink-0 transition-colors"
        >
          Open Source Docs
        </button>
      </div>
    </div>
  );
}
