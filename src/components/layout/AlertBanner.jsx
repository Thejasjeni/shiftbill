import React from 'react';
import { X, Code2, CheckCircle2 } from 'lucide-react';
import { useDashboard } from '../../context/DashboardContext';

export default function AlertBanner() {
  const { isBannerDismissed, setIsBannerDismissed } = useDashboard();

  if (isBannerDismissed) return null;

  return (
    <div className="bg-gradient-to-r from-teal-600 via-emerald-600 to-indigo-700 text-white px-3 py-2 sm:px-6 sm:py-2.5 shadow-xs transition-all animate-fadeIn">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-4">
        {/* Open source message with icon */}
        <div className="flex items-center gap-2.5 text-center sm:text-left">
          <div className="p-1 rounded-full bg-white/20 shrink-0">
            <CheckCircle2 className="w-4 h-4 text-emerald-200" />
          </div>
          <p className="text-xs sm:text-sm font-medium tracking-tight text-white leading-tight">
            <strong className="font-bold">SwiftBill Community Edition:</strong> 100% Free & Open-Source. Unlimited invoices, offline billing & no subscriptions required.
          </p>
        </div>

        {/* Action Button & Close */}
        <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
          <button
            onClick={() => window.open("https://github.com", "_blank")}
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/15 hover:bg-white/25 active:scale-95 text-xs font-semibold text-white border border-white/20 transition-all cursor-pointer"
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>Open Source</span>
          </button>
          
          <button
            onClick={() => setIsBannerDismissed(true)}
            className="p-1 text-white/80 hover:text-white hover:bg-white/10 rounded-md transition-colors cursor-pointer"
            aria-label="Dismiss banner"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
