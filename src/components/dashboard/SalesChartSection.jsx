import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Calendar, ChevronDown, TrendingUp, Info } from 'lucide-react';
import { useDashboard } from '../../context/DashboardContext';
import {
  PLOT_PADDING,
  buildGeometry,
  buildScale,
  compactINR,
  selectLabelPoints,
  smoothPath
} from '../../utils/chartMath';

const SERIES = [
  { key: 'amount', label: 'Sales', color: '#4F46E5' },
  { key: 'expense', label: 'Expense', color: '#F43F5E' },
  { key: 'profit', label: 'Profit', color: '#059669' }
];

const FILTER_OPTIONS = ['Today', 'This Week', 'This Month', 'Last Month', 'This Quarter'];

const EMPTY_SIZE = { width: 560, height: 200 };
// Stable fallbacks so downstream memo dependencies never change identity
const EMPTY_BUCKETS = [];
const EMPTY_TOTALS = { sales: 0, expense: 0, profit: 0, invoices: 0 };

export default function SalesChartSection() {
  const { currentData, salesTimeRange, setSalesTimeRange } = useDashboard();
  const [activeIndex, setActiveIndex] = useState(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [size, setSize] = useState(EMPTY_SIZE);
  const dropdownRef = useRef(null);
  const plotRef = useRef(null);

  const buckets = currentData.salesTimeline || EMPTY_BUCKETS;
  const totals = currentData.salesRangeTotals || EMPTY_TOTALS;
  const hasData = buckets.some(bucket => bucket.amount > 0 || bucket.expense > 0);

  // Close the range dropdown on outside click / Escape
  useEffect(() => {
    if (!isDropdownOpen) return;
    const handlePointer = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) setIsDropdownOpen(false);
    };
    const handleKey = (event) => {
      if (event.key === 'Escape') setIsDropdownOpen(false);
    };
    document.addEventListener('mousedown', handlePointer);
    document.addEventListener('touchstart', handlePointer);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handlePointer);
      document.removeEventListener('touchstart', handlePointer);
      document.removeEventListener('keydown', handleKey);
    };
  }, [isDropdownOpen]);

  // Draw in real pixels so nothing is stretched
  useEffect(() => {
    const element = plotRef.current;
    if (!element) return;
    const measure = () => {
      const rect = element.getBoundingClientRect();
      if (!rect.width) return;
      setSize({
        width: Math.round(rect.width),
        height: Math.round(rect.height) || EMPTY_SIZE.height
      });
    };
    measure();
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', measure);
      return () => window.removeEventListener('resize', measure);
    }
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const formatCurrency = (value) => new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(value || 0);

  const scale = useMemo(() => buildScale(buckets), [buckets]);

  const geometry = useMemo(() => buildGeometry(buckets, size, scale), [buckets, size, scale]);

  const labelPoints = useMemo(
    () => selectLabelPoints(geometry.points, geometry.plotWidth),
    [geometry]
  );

  const activePoint = activeIndex === null ? null : geometry.points[activeIndex];
  const salesPath = smoothPath(geometry.points, 'ySales');
  const profitPath = smoothPath(geometry.points, 'yProfit');
  const salesArea = geometry.points.length
    ? `${salesPath} L ${geometry.points[geometry.points.length - 1].x} ${geometry.baseline} L ${geometry.points[0].x} ${geometry.baseline} Z`
    : '';

  // One pointer handler over the whole plot: snap to the nearest bucket
  const handlePointer = (event) => {
    if (!buckets.length) return;
    const rect = event.currentTarget.getBoundingClientRect();
    if (!rect.width) return;
    const ratio = (event.clientX - rect.left) / rect.width;
    const index = Math.round(ratio * (buckets.length - 1));
    setActiveIndex(Math.min(buckets.length - 1, Math.max(0, index)));
  };

  const handleKeyDown = (event) => {
    if (!buckets.length) return;
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
      event.preventDefault();
      const step = event.key === 'ArrowRight' ? 1 : -1;
      setActiveIndex((current) => {
        const next = (current === null ? 0 : current + step);
        return Math.min(buckets.length - 1, Math.max(0, next));
      });
    } else if (event.key === 'Escape') {
      setActiveIndex(null);
    }
  };

  const tooltipX = activePoint
    ? Math.min(Math.max(activePoint.x, 96), Math.max(96, geometry.width - 96))
    : 0;

  return (
    <section className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs transition-all">
      {/* Header: the range's own sales total, so it matches the plotted window */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div>
          <h2 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight flex items-center gap-1.5">
            <span>{salesTimeRange} Sales:</span>
            <span className="text-indigo-600 font-extrabold text-base sm:text-lg">
              {formatCurrency(totals.sales)}
            </span>
          </h2>
          <p className="text-[11px] text-slate-500 mt-0.5 text-left">
            Timeline: {salesTimeRange}
          </p>
        </div>

        <div className="relative self-start sm:self-auto" ref={dropdownRef}>
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            aria-haspopup="listbox"
            aria-expanded={isDropdownOpen}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-700 transition-colors cursor-pointer"
          >
            <Calendar className="w-3.5 h-3.5 text-indigo-600" />
            <span>{salesTimeRange}</span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {isDropdownOpen && (
            <div className="absolute right-0 mt-1 w-36 bg-white rounded-xl shadow-lg border border-slate-100 py-1 z-20 text-xs">
              {FILTER_OPTIONS.map((option) => (
                <button
                  key={option}
                  onClick={() => {
                    setSalesTimeRange(option);
                    setIsDropdownOpen(false);
                    setActiveIndex(null);
                  }}
                  className={`w-full text-left px-3 py-2 hover:bg-indigo-50 hover:text-indigo-600 transition-colors ${
                    salesTimeRange === option ? 'font-bold text-indigo-600 bg-indigo-50/50' : 'text-slate-700'
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1">
        {SERIES.map(series => (
          <span key={series.key} className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-600">
            <span className="w-3.5 h-1.5 rounded-full" style={{ backgroundColor: series.color }} />
            {series.label}
          </span>
        ))}
      </div>

      {/* Chart */}
      <div className="mt-2 relative">
        {activePoint && (
          <div
            className="absolute z-20 top-1 px-3 py-2 rounded-xl bg-[#1E1B4B] text-white shadow-lg pointer-events-none -translate-x-1/2"
            style={{ left: tooltipX }}
          >
            <p className="text-[10px] font-semibold text-slate-300 whitespace-nowrap">{activePoint.fullDate}</p>
            <div className="mt-1 space-y-0.5">
              {SERIES.map(series => (
                <div key={series.key} className="flex items-center justify-between gap-4 text-[11px] whitespace-nowrap">
                  <span className="flex items-center gap-1.5 text-slate-300">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: series.color }} />
                    {series.label}
                  </span>
                  <span className={`font-bold ${series.key === 'profit' && activePoint.profit < 0 ? 'text-rose-300' : 'text-white'}`}>
                    {formatCurrency(activePoint[series.key])}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div
          ref={plotRef}
          tabIndex={0}
          role="img"
          onKeyDown={handleKeyDown}
          onBlur={() => setActiveIndex(null)}
          aria-label={`${salesTimeRange}: sales ${formatCurrency(totals.sales)}, expenses ${formatCurrency(totals.expense)}, net profit ${formatCurrency(totals.profit)}`}
          className="relative w-full h-48 sm:h-56 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-indigo-200"
        >
          <svg
            viewBox={`0 0 ${geometry.width} ${geometry.height}`}
            className="block w-full h-full overflow-visible"
          >
            <defs>
              <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={SERIES[0].color} stopOpacity="0.22" />
                <stop offset="100%" stopColor={SERIES[0].color} stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Empty state: a bare baseline instead of meaningless tick values */}
            {!hasData && (
              <line
                x1={PLOT_PADDING.left}
                y1={geometry.yFor(0)}
                x2={geometry.width - PLOT_PADDING.right}
                y2={geometry.yFor(0)}
                stroke="#E2E8F0"
                strokeWidth="1"
              />
            )}

            {/* Grid lines with their value labels */}
            {hasData && scale.ticks.map((tick) => {
              const y = geometry.yFor(tick);
              const isZero = tick === 0;
              return (
                <g key={tick}>
                  <line
                    x1={PLOT_PADDING.left}
                    y1={y}
                    x2={geometry.width - PLOT_PADDING.right}
                    y2={y}
                    stroke={isZero && scale.min < 0 ? '#CBD5E1' : '#F1F5F9'}
                    strokeWidth="1"
                    strokeDasharray={isZero && scale.min < 0 ? undefined : '4 4'}
                  />
                  <text
                    x={PLOT_PADDING.left - 8}
                    y={y + 3}
                    textAnchor="end"
                    fontSize="9"
                    fill="#94A3B8"
                  >
                    {compactINR(tick)}
                  </text>
                </g>
              );
            })}

            {/* Expense bars */}
            {hasData && geometry.points.map((point) => {
              const top = Math.min(point.yExpense, geometry.baseline);
              const height = Math.abs(geometry.baseline - point.yExpense);
              if (height < 0.5) return null;
              return (
                <rect
                  key={`bar-${point.key}`}
                  x={point.x - geometry.barWidth / 2}
                  y={top}
                  width={geometry.barWidth}
                  height={height}
                  rx="2"
                  fill={SERIES[1].color}
                  fillOpacity="0.45"
                />
              );
            })}

            {/* Sales area + line */}
            {hasData && <path d={salesArea} fill="url(#salesGradient)" />}
            {hasData && (
              <path
                d={salesPath}
                fill="none"
                stroke={SERIES[0].color}
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}

            {/* Profit line (sales − expenses per bucket) */}
            {hasData && (
              <path
                d={profitPath}
                fill="none"
                stroke={SERIES[2].color}
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}

            {/* Crosshair for the active bucket */}
            {activePoint && (
              <line
                x1={activePoint.x}
                y1={PLOT_PADDING.top}
                x2={activePoint.x}
                y2={geometry.height - PLOT_PADDING.bottom}
                stroke="#CBD5E1"
                strokeWidth="1"
                strokeDasharray="3 3"
              />
            )}

            {/* Data points */}
            {hasData && geometry.points.map((point) => {
              const isActive = activePoint?.key === point.key;
              return (
                <g key={`pt-${point.key}`} className="pointer-events-none">
                  <circle
                    cx={point.x}
                    cy={point.ySales}
                    r={isActive ? 4.5 : 3}
                    fill="#FFFFFF"
                    stroke={SERIES[0].color}
                    strokeWidth="2"
                  />
                  <circle
                    cx={point.x}
                    cy={point.yProfit}
                    r={isActive ? 4 : 2.5}
                    fill="#FFFFFF"
                    stroke={SERIES[2].color}
                    strokeWidth="1.8"
                  />
                </g>
              );
            })}

            {/* Single hit target across the plot, snapping to the nearest bucket */}
            <rect
              x={PLOT_PADDING.left}
              y={PLOT_PADDING.top}
              width={geometry.plotWidth}
              height={geometry.plotHeight}
              fill="transparent"
              className="cursor-crosshair"
              onPointerMove={handlePointer}
              onPointerDown={handlePointer}
              onPointerLeave={() => setActiveIndex(null)}
            />
          </svg>

          {!hasData && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6">
              <p className="text-xs font-semibold text-slate-500">No sales or expenses in this period</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Pick another range or record a sale to see the chart</p>
            </div>
          )}
        </div>

        {/* Date labels, positioned under each bucket's real x coordinate */}
        <div className="relative h-4 mt-1 select-none">
          {labelPoints.map((point) => {
            const isActive = activePoint?.key === point.key;
            return (
              <span
                key={point.key}
                className={`absolute -translate-x-1/2 text-[10px] font-medium transition-colors ${
                  isActive ? 'text-indigo-600 font-bold' : 'text-slate-400'
                }`}
                style={{ left: point.x }}
              >
                {point.date}
              </span>
            );
          })}
        </div>
      </div>

      {/* Summary strip for the same window */}
      <div className="mt-3 pt-3 border-t border-slate-100">
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-xl bg-slate-50 px-2.5 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Sales</p>
            <p className="text-xs sm:text-sm font-bold text-slate-900">{formatCurrency(totals.sales)}</p>
          </div>
          <div className="rounded-xl bg-rose-50/70 px-2.5 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-rose-400">Expenses</p>
            <p className="text-xs sm:text-sm font-bold text-rose-600">{formatCurrency(totals.expense)}</p>
          </div>
          <div className={`rounded-xl px-2.5 py-2 ${totals.profit < 0 ? 'bg-rose-50/70' : 'bg-emerald-50/70'}`}>
            <p className={`text-[10px] font-semibold uppercase tracking-wide ${totals.profit < 0 ? 'text-rose-400' : 'text-emerald-500'}`}>
              Net profit
            </p>
            <p className={`text-xs sm:text-sm font-bold ${totals.profit < 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
              {formatCurrency(totals.profit)}
            </p>
          </div>
        </div>

        <div className="mt-2.5 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-1.5 text-[11px]">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
            <span className="font-semibold text-slate-700">
              {totals.invoices} invoice(s) in {salesTimeRange.toLowerCase()}
            </span>
          </div>
          <div className="text-[11px] text-slate-400 flex items-center gap-1">
            <Info className="w-3 h-3" />
            <span>Real-time local tracking</span>
          </div>
        </div>
      </div>
    </section>
  );
}
