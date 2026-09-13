import React, { useState, useEffect, useRef } from 'react';
import { Calendar, ChevronDown, TrendingUp, Info } from 'lucide-react';
import { useDashboard } from '../../context/DashboardContext';

export default function SalesChartSection() {
  const { currentData, salesTimeRange, setSalesTimeRange } = useDashboard();
  const [activePoint, setActivePoint] = useState(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const filterOptions = ['Today', 'This Week', 'This Month', 'Last Month', 'This Quarter'];

  // Close the dropdown on outside click / Escape
  useEffect(() => {
    if (!isDropdownOpen) return;
    const handlePointer = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsDropdownOpen(false);
      }
    };
    const handleKey = (e) => {
      if (e.key === 'Escape') setIsDropdownOpen(false);
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

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val || 0);
  };

  const timeline = currentData.salesTimeline;
  const maxAmount = Math.max(...timeline.map(t => t.amount), 10000);

  // SVG Chart Geometry dimensions
  const svgWidth = 600;
  const svgHeight = 180;
  const paddingX = 35;
  const paddingY = 25;

  const points = timeline.map((item, index) => {
    const x = paddingX + (index / (timeline.length - 1)) * (svgWidth - paddingX * 2);
    const normalizedY = item.amount / maxAmount;
    const y = (svgHeight - paddingY) - normalizedY * (svgHeight - paddingY * 2);
    return { ...item, x, y };
  });

  // Create smooth SVG cubic bezier path
  const linePath = points.reduce((acc, point, index) => {
    if (index === 0) return `M ${point.x} ${point.y}`;
    const prev = points[index - 1];
    const cp1x = prev.x + (point.x - prev.x) / 2;
    const cp1y = prev.y;
    const cp2x = prev.x + (point.x - prev.x) / 2;
    const cp2y = point.y;
    return `${acc} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${point.x} ${point.y}`;
  }, '');

  // Area path closing at the bottom
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${svgHeight - paddingY} L ${points[0].x} ${svgHeight - paddingY} Z`;

  return (
    <section className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs transition-all">
      {/* Header Row: Title & Filter Dropdown */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight flex items-center gap-1.5">
              <span>Total Sale:</span>
              <span className="text-indigo-600 font-extrabold text-base sm:text-lg">
                {formatCurrency(currentData.totalSale)}
              </span>
            </h2>
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5 text-left">
            Timeline: {salesTimeRange}
          </p>
        </div>

        {/* Filter Dropdown */}
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
              {filterOptions.map((opt) => (
                <button
                  key={opt}
                  onClick={() => {
                    setSalesTimeRange(opt);
                    setIsDropdownOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 hover:bg-indigo-50 hover:text-indigo-600 transition-colors ${
                    salesTimeRange === opt ? 'font-bold text-indigo-600 bg-indigo-50/50' : 'text-slate-700'
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Chart Area */}
      <div className="mt-4 relative">        {/* Active Point Floating Tooltip */}
        {activePoint && (
          <div
            className="absolute z-10 -top-8 px-2.5 py-1 rounded-md bg-[#1E1B4B] text-white text-xs font-semibold shadow-lg -translate-x-1/2 pointer-events-none transition-all duration-150 flex items-center gap-1"
            style={{
              left: `${((activePoint.x / svgWidth) * 100).toFixed(2)}%`,
              maxWidth: '90%'
            }}
          >
            <span className="whitespace-nowrap">{activePoint.date}:</span>
            <span className="text-emerald-400 whitespace-nowrap">{formatCurrency(activePoint.amount)}</span>
          </div>
        )}

        {/* SVG Responsive Line Chart */}
        <div className="w-full overflow-hidden">
          <svg
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            className="w-full h-40 sm:h-48 overflow-visible"
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#6366F1" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#6366F1" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Subtle Horizontal Grid lines */}
            {[0.25, 0.5, 0.75, 1.0].map((ratio, i) => {
              const y = (svgHeight - paddingY) - ratio * (svgHeight - paddingY * 2);
              return (
                <line
                  key={i}
                  x1={paddingX}
                  y1={y}
                  x2={svgWidth - paddingX}
                  y2={y}
                  stroke="#F1F5F9"
                  strokeWidth="1"
                  strokeDasharray="4 4"
                />
              );
            })}

            {/* Base axis */}
            <line
              x1={paddingX}
              y1={svgHeight - paddingY}
              x2={svgWidth - paddingX}
              y2={svgHeight - paddingY}
              stroke="#E2E8F0"
              strokeWidth="1"
            />

            {/* Area Fill */}
            <path d={areaPath} fill="url(#salesGradient)" />

            {/* Line Path */}
            <path
              d={linePath}
              fill="none"
              stroke="#4F46E5"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Interactive Data Points (Touch & Mouse accessible) */}
            {points.map((pt, i) => (
              <g
                key={i}
                className="cursor-pointer"
                onMouseEnter={() => setActivePoint(pt)}
                onMouseLeave={() => setActivePoint(null)}
                onTouchStart={() => setActivePoint(pt)}
                onTouchEnd={() => setTimeout(() => setActivePoint(null), 1800)}
              >
                {/* Hit target radius */}
                <circle cx={pt.x} cy={pt.y} r="14" fill="transparent" />
                
                {/* Visual point */}
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r={activePoint?.date === pt.date ? "5" : "3.5"}
                  fill="#FFFFFF"
                  stroke="#4F46E5"
                  strokeWidth="2.5"
                  className="transition-all duration-150"
                />
              </g>
            ))}
          </svg>
        </div>

        {/* Horizontal Dates Axis: 1 Sep to 28 Sep */}
        <div className="flex justify-between items-center text-[10px] sm:text-xs text-slate-400 font-medium px-1 sm:px-4 mt-1 select-none">
          {timeline.map((item) => (
            <span
              key={item.date}
              className={`transition-colors ${
                activePoint?.date === item.date ? 'text-indigo-600 font-bold' : ''
              }`}
            >
              {item.date}
            </span>
          ))}
        </div>
      </div>

      {/* Footer Snapshot & Quick Stats */}
      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
        <div className="flex items-center gap-1.5 text-[11px]">
          <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
          <span className="font-semibold text-slate-700">
            {currentData.totalSale > 0
              ? `${currentData.transactions.filter(t => t.type === 'sale').length} invoice(s) recorded`
              : '0 invoices recorded'}
          </span>
        </div>
        <div className="text-[11px] text-slate-400 flex items-center gap-1">
          <Info className="w-3 h-3" />
          <span>Real-time local tracking</span>
        </div>
      </div>
    </section>
  );
}
