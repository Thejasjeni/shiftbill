import React from 'react';
import { X, Sparkles, Check, ShieldCheck, Zap, Smartphone, HardDrive, Printer, Code2, Heart } from 'lucide-react';
import { useDashboard } from '../../context/DashboardContext';

export default function PremiumUpgradeModal() {
  const { isUpgradeModalOpen, setIsUpgradeModalOpen } = useDashboard();

  if (!isUpgradeModalOpen) return null;

  const features = [
    { icon: HardDrive, text: "100% Offline-First Architecture & Complete Data Ownership" },
    { icon: Zap, text: "Unlimited Invoices, Purchase Bills & Estimates" },
    { icon: ShieldCheck, text: "GST Filing Ready (GSTR-1, GSTR-3B & E-Way Bill Exports)" },
    { icon: Printer, text: "Standard & Thermal Slip Bill Printing (Bluetooth / USB)" },
    { icon: Smartphone, text: "Responsive Mobile & Desktop Workflows with Zero Subscriptions" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/65 backdrop-blur-xs p-3 sm:p-4 animate-fadeIn">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header with SwiftBill branding and vibrant gradient */}
        <div className="bg-gradient-to-r from-teal-600 via-emerald-600 to-indigo-800 text-white p-6 relative text-left">
          <button
            onClick={() => setIsUpgradeModalOpen(false)}
            className="absolute top-4 right-4 p-1.5 rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3 mb-2">
            <img
              src="/logo.png"
              alt="SwiftBill Logo"
              className="w-10 h-10 rounded-xl object-contain ring-2 ring-white/30 shadow-md"
            />
            <div>
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white/20 text-white text-[10px] font-bold tracking-wider">
                <Sparkles className="w-3 h-3 fill-white" />
                <span>FREE & OPEN SOURCE (FOSS)</span>
              </div>
              <h3 className="text-xl sm:text-2xl font-black tracking-tight leading-snug">
                SwiftBill Community Edition
              </h3>
            </div>
          </div>
          <p className="text-xs sm:text-sm text-emerald-100 mt-1">
            Zero subscription fees, no locked features, and complete privacy.
          </p>
        </div>

        {/* Free Plan Card & Feature List */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 text-left">
          {/* Zero Cost Card */}
          <div className="border-2 border-emerald-500/40 bg-emerald-50/50 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md">
                Uncapped Free License
              </span>
              <div className="text-2xl font-black text-slate-900 mt-1 flex items-baseline gap-1.5">
                <span>₹0</span>
                <span className="text-xs font-semibold text-emerald-600">Free Forever</span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">Licensed under permissive MIT License</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-bold text-lg shadow-md shadow-emerald-500/30">
              <Heart className="w-6 h-6 fill-white" />
            </div>
          </div>

          {/* Feature List */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
              Included In Open Source Edition
            </h4>
            <div className="space-y-2.5">
              {features.map((feat, idx) => {
                const Icon = feat.icon;
                return (
                  <div key={idx} className="flex items-center gap-3 text-xs sm:text-sm text-slate-700">
                    <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    </div>
                    <span>{feat.text}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Community pledge */}
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-600 flex items-center gap-2.5">
            <Code2 className="w-4 h-4 text-slate-700 shrink-0" />
            <span>Contributions, bug reports and feature requests are welcome on GitHub!</span>
          </div>

          {/* CTA Buttons */}
          <div className="pt-2 space-y-2">
            <button
              onClick={() => {
                setIsUpgradeModalOpen(false);
              }}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-teal-600 to-indigo-700 hover:from-teal-700 hover:to-indigo-800 active:scale-[0.98] text-white font-bold text-sm sm:text-base shadow-lg shadow-indigo-500/25 transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <span>Continue Using SwiftBill (Free)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
