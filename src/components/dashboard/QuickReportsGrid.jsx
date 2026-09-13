import React from 'react';
import {
  BadgePercent,
  ReceiptText,
  BookOpenCheck,
  Users2,
  ChevronRight,
  FileSpreadsheet
} from 'lucide-react';
import { useDashboard } from '../../context/DashboardContext';
import { QUICK_REPORTS } from '../../data/mockData';

const ICONS_MAP = {
  BadgePercent,
  ReceiptText,
  BookOpenCheck,
  Users2,
};

export default function QuickReportsGrid() {
  const { setActiveReportModal } = useDashboard();

  return (
    <section className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs transition-all">
      {/* Section Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <FileSpreadsheet className="w-4 h-4 text-indigo-600" />
          <h2 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
            Most Used Reports & Quick Links
          </h2>
        </div>
        <span className="text-[11px] text-slate-400 font-medium hidden xs:inline-block">
          Instant Reports
        </span>
      </div>

      {/* Grid of touch-friendly list items with right-pointing chevrons */}
      <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2.5 sm:gap-3">
        {QUICK_REPORTS.map((report) => {
          const Icon = ICONS_MAP[report.icon] || ReceiptText;
          return (
            <button
              key={report.id}
              onClick={() => setActiveReportModal(report)}
              className="w-full flex items-center justify-between p-3.5 sm:p-4 rounded-xl border border-slate-100 bg-slate-50/70 hover:bg-indigo-50/40 hover:border-indigo-100 active:scale-[0.99] transition-all text-left cursor-pointer group"
            >
              {/* Left: Icon & Info */}
              <div className="flex items-center gap-3 min-w-0">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center border shrink-0 transition-transform group-hover:scale-105 ${report.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="overflow-hidden">
                  <h3 className="text-xs sm:text-sm font-bold text-slate-800 group-hover:text-indigo-900 transition-colors truncate">
                    {report.title}
                  </h3>
                  <p className="text-[11px] text-slate-500 truncate mt-0.5">
                    {report.subtitle}
                  </p>
                </div>
              </div>

              {/* Right: Chevron */}
              <div className="pl-2 shrink-0">
                <div className="w-7 h-7 rounded-full bg-white border border-slate-200/80 flex items-center justify-center text-slate-400 group-hover:text-indigo-600 group-hover:border-indigo-200 group-hover:translate-x-0.5 transition-all shadow-2xs">
                  <ChevronRight className="w-4 h-4" />
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
