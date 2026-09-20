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
import { RANGE_LABELS } from '../../utils/salesTimeline';
import { formatINR } from '../../utils/money';
import Money from '../ui/Money';
import Surface from '../ui/Surface';
import TrendPill from '../ui/TrendPill';

// Token names, not shades: the dark palette brightens these three and dims
// the grid, and the same value drives the lines, the dots, the legend and
// the tooltip swatches. Applied through `style` because a CSS variable in an
// SVG presentation attribute is not substituted.
const SERIES = [
  { key: 'amount', label: 'Sales', color: 'var(--color-series-sales)' },
  { key: 'expense', label: 'Expense', color: 'var(--color-series-expense)' },
  { key: 'profit', label: 'Profit', color: 'var(--color-series-profit)' }
];

const EMPTY_SIZE = { width: 560, height: 200 };
// Stable fallbacks so downstream memo dependencies never change identity
const EMPTY_BUCKETS = [];
const EMPTY_TOTALS = { sales: 0, expense: 0, profit: 0, invoices: 0 };
// Money colours are reserved; the chart's series use the same three, so the
// legend, the lines and the summary read as one system.
const MONEY = { sales: 'in', expense: 'out', profit: 'auto' };

export default function SalesChartSection() {
  const { currentData, salesTimeRange, setSalesTimeRange } = useDashboard();
  const [activeIndex, setActiveIndex] = useState(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [size, setSize] = useState(EMPTY_SIZE);
  const dropdownRef = useRef(null);
  const plotRef = useRef(null);

  const buckets = currentData.salesTimeline || EMPTY_BUCKETS;
  const totals = currentData.salesRangeTotals || EMPTY_TOTALS;
  const previous = currentData.previousRange || EMPTY_TOTALS;
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
    <Surface padding="lg">
      {/* Header: the range's own sales total, so it matches the plotted window */}
      <div className="flex flex-col justify-between gap-3 border-b border-hairline/60 pb-3 sm:flex-row sm:items-center">
        <div>
          <h2 className="flex items-center gap-1.5 text-title font-bold tracking-tight text-ink">
            <span>{salesTimeRange} sales:</span>
            <Money value={totals.sales} tone="in" className="text-title font-extrabold" />
          </h2>
          <p className="mt-0.5 text-left text-micro text-ink-muted">
            Timeline: {salesTimeRange}
          </p>
        </div>

        <div className="relative self-start sm:self-auto" ref={dropdownRef}>
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            aria-haspopup="listbox"
            aria-expanded={isDropdownOpen}
            className="flex items-center gap-1.5 rounded-[var(--radius-control)] bg-surface-2 px-3 py-1.5 text-micro font-semibold text-ink ring-1 ring-hairline/70 transition-colors hover:bg-surface-3 cursor-pointer"
          >
            <Calendar className="h-3.5 w-3.5 text-[var(--color-brand)]" />
            <span>{salesTimeRange}</span>
            <ChevronDown className="h-3.5 w-3.5 text-ink-subtle" />
          </button>

          {isDropdownOpen && (
            <div className="absolute right-0 z-20 mt-1 w-36 rounded-[var(--radius-card)] bg-surface py-1 text-body shadow-e3 ring-1 ring-hairline/70">
              {RANGE_LABELS.map((option) => (
                <button
                  key={option}
                  onClick={() => {
                    setSalesTimeRange(option);
                    setIsDropdownOpen(false);
                    setActiveIndex(null);
                  }}
                  className={`w-full px-3 py-2 text-left transition-colors hover:bg-surface-2 hover:text-[var(--color-brand)] cursor-pointer ${
                    salesTimeRange === option
                      ? 'bg-[var(--color-brand)]/8 font-bold text-[var(--color-brand)]'
                      : 'text-ink-muted'
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
          <span key={series.key} className="flex items-center gap-1.5 text-micro font-semibold text-ink-muted">
            <span className="h-1.5 w-3.5 rounded-full" style={{ backgroundColor: series.color }} />
            {series.label}
          </span>
        ))}
      </div>

      {/* Chart */}
      <div className="mt-2 relative">
        {activePoint && hasData && (
          <div
            className="pointer-events-none absolute top-1 z-20 -translate-x-1/2 rounded-[var(--radius-control)] bg-[var(--color-brand-deep)] px-3 py-2 text-white shadow-e3"
            style={{ left: tooltipX }}
          >
            <p className="whitespace-nowrap text-micro font-semibold text-white/70">{activePoint.fullDate}</p>
            <div className="mt-1 space-y-0.5">
              {SERIES.map(series => (
                <div key={series.key} className="flex items-center justify-between gap-4 whitespace-nowrap text-micro">
                  <span className="flex items-center gap-1.5 text-white/70">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: series.color }} />
                    {series.label}
                  </span>
                  <span className={`num font-bold ${series.key === 'profit' && activePoint.profit < 0 ? 'text-[var(--color-danger-bright)]' : 'text-white'}`}>
                    {formatINR(activePoint[series.key])}
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
          aria-label={`${salesTimeRange}: sales ${formatINR(totals.sales)}, expenses ${formatINR(totals.expense)}, net profit ${formatINR(totals.profit)}`}
          className="relative h-48 w-full rounded-[var(--radius-control)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand)]/40 sm:h-56"
        >
          <svg
            viewBox={`0 0 ${geometry.width} ${geometry.height}`}
            className="block w-full h-full overflow-visible"
          >
            <defs>
              <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" style={{ stopColor: SERIES[0].color }} stopOpacity="0.22" />
                <stop offset="100%" style={{ stopColor: SERIES[0].color }} stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Empty state: a bare baseline instead of meaningless tick values */}
            {!hasData && (
              <line
                x1={PLOT_PADDING.left}
                y1={geometry.yFor(0)}
                x2={geometry.width - PLOT_PADDING.right}
                y2={geometry.yFor(0)}
                style={{ stroke: 'var(--color-chart-grid)' }}
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
                    style={{ stroke: isZero && scale.min < 0 ? 'var(--color-chart-grid-strong)' : 'var(--color-chart-grid)' }}
                    strokeWidth="1"
                    strokeDasharray={isZero && scale.min < 0 ? undefined : '4 4'}
                  />
                  <text
                    x={PLOT_PADDING.left - 8}
                    y={y + 3}
                    textAnchor="end"
                    fontSize="9"
                    style={{ fill: 'var(--color-chart-label)' }}
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
                  style={{ fill: SERIES[1].color }}
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
                style={{ stroke: SERIES[0].color }}
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
                style={{ stroke: SERIES[2].color }}
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
                style={{ stroke: 'var(--color-chart-grid-strong)' }}
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
                    style={{ fill: 'var(--color-surface)', stroke: SERIES[0].color }}
                    strokeWidth="2"
                  />
                  <circle
                    cx={point.x}
                    cy={point.yProfit}
                    r={isActive ? 4 : 2.5}
                    style={{ fill: 'var(--color-surface)', stroke: SERIES[2].color }}
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
            <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
              <p className="text-body font-semibold text-ink-muted">No sales or expenses in this period</p>
              <p className="mt-0.5 text-micro text-ink-subtle">Pick another range, or record a sale to see the chart</p>
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
                className={`num absolute -translate-x-1/2 text-micro font-medium transition-colors ${
                  isActive ? 'font-bold text-[var(--color-brand)]' : 'text-ink-subtle'
                }`}
                style={{ left: point.x }}
              >
                {point.date}
              </span>
            );
          })}
        </div>
      </div>

      {/* Summary for the same window. Each figure carries its change against
          the equivalent previous period — or no pill at all when there is no
          earlier data to compare with, rather than a fabricated 0%. */}
      <div className="mt-3 border-t border-hairline/60 pt-3">
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-[var(--radius-control)] bg-surface-2 px-2.5 py-2">
            <p className="text-micro font-semibold uppercase tracking-wide text-ink-subtle">Sales</p>
            <Money value={totals.sales} tone={MONEY.sales} className="text-body font-bold" />
            <TrendPill current={totals.sales} previous={previous.sales} label={`the previous ${salesTimeRange.toLowerCase()}`} />
          </div>
          <div className="rounded-[var(--radius-control)] bg-[var(--color-out)]/8 px-2.5 py-2">
            <p className="text-micro font-semibold uppercase tracking-wide text-[var(--color-out)]">Expenses</p>
            <Money value={totals.expense} tone="out" className="text-body font-bold" />
            <TrendPill current={totals.expense} previous={previous.expense} label={`the previous ${salesTimeRange.toLowerCase()}`} />
          </div>
          <div className={`rounded-[var(--radius-control)] px-2.5 py-2 ${totals.profit < 0 ? 'bg-[var(--color-danger)]/8' : 'bg-[var(--color-in)]/8'}`}>
            <p className={`text-micro font-semibold uppercase tracking-wide ${totals.profit < 0 ? 'text-[var(--color-danger)]' : 'text-[var(--color-in)]'}`}>
              Net profit
            </p>
            <Money value={totals.profit} tone={MONEY.profit} className="text-body font-bold" />
            <TrendPill current={totals.profit} previous={previous.profit} label={`the previous ${salesTimeRange.toLowerCase()}`} />
          </div>
        </div>

        <div className="mt-2.5 flex items-center justify-between text-micro text-ink-muted">
          <span className="flex items-center gap-1.5">
            <TrendingUp className="h-3.5 w-3.5 text-[var(--color-in)]" />
            <span className="font-semibold text-ink">
              {totals.invoices} {totals.invoices === 1 ? 'bill' : 'bills'} in {salesTimeRange.toLowerCase()}
            </span>
          </span>
          <span className="flex items-center gap-1 text-ink-subtle">
            <Info className="h-3 w-3" />
            From your saved bills
          </span>
        </div>
      </div>
    </Surface>
  );
}
