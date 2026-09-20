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
import Surface from '../ui/Surface';

const ICONS_MAP = {
  BadgePercent,
  ReceiptText,
  BookOpenCheck,
  Users2,
};

export default function QuickReportsGrid() {
  const { setActiveReportModal } = useDashboard();

  return (
    <Surface padding="lg">
      {/* Section Header */}
      <div className="flex items-center justify-between border-b border-hairline/60 pb-3">
        <div className="flex items-center gap-2">
          <FileSpreadsheet className="h-4 w-4 text-[var(--color-brand)]" />
          <h2 className="text-title font-bold tracking-tight text-ink">
            Reports &amp; quick links
          </h2>
        </div>
        <span className="hidden text-micro font-medium text-ink-subtle xs:inline-block">
          Instant reports
        </span>
      </div>

      {/* Grid of touch-friendly rows with right-pointing chevrons */}
      <div className="mt-3 grid grid-cols-1 gap-2.5 md:grid-cols-2 sm:gap-3">
        {QUICK_REPORTS.map((report) => {
          const Icon = ICONS_MAP[report.icon] || ReceiptText;
          return (
            <button
              key={report.id}
              onClick={() => setActiveReportModal(report)}
              className="group flex w-full items-center justify-between rounded-[var(--radius-control)] bg-surface-2/70 p-3.5 text-left ring-1 ring-hairline/50 transition-all hover:bg-[var(--color-brand)]/8 hover:ring-[var(--color-brand)]/25 active:scale-[0.99] cursor-pointer sm:p-4"
            >
              {/* Left: Icon & Info */}
              <div className="flex min-w-0 items-center gap-3">
                <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-[var(--radius-control)] ring-1 ${report.color}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="overflow-hidden">
                  <h3 className="truncate text-body font-bold text-ink">
                    {report.title}
                  </h3>
                  <p className="mt-0.5 truncate text-micro text-ink-muted">
                    {report.subtitle}
                  </p>
                </div>
              </div>

              {/* Right: Chevron */}
              <div className="shrink-0 pl-2">
                <div className="grid h-7 w-7 place-items-center rounded-full bg-surface text-ink-subtle ring-1 ring-hairline/70 transition-all group-hover:translate-x-0.5 group-hover:text-[var(--color-brand)]">
                  <ChevronRight className="h-4 w-4" />
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </Surface>
  );
}
