// Pure chart arithmetic: value axis, plot geometry, label placement and series
// paths. No React and no state — the chart component only wires these together.

// Inner padding of the plot area (left keeps room for the axis labels)
export const PLOT_PADDING = { top: 16, right: 12, bottom: 4, left: 50 };

// Axis labels have to stay legible: ₹250 / ₹1.2k / ₹1.2L / ₹1.2Cr
export function compactINR(value) {
  const amount = Number(value) || 0;
  const abs = Math.abs(amount);
  const sign = amount < 0 ? '-' : '';
  const round = (n) => (n >= 10 ? Math.round(n) : Math.round(n * 10) / 10);
  if (abs >= 10000000) return `${sign}₹${round(abs / 10000000)}Cr`;
  if (abs >= 100000) return `${sign}₹${round(abs / 100000)}L`;
  if (abs >= 1000) return `${sign}₹${round(abs / 1000)}k`;
  return `${sign}₹${Math.round(abs)}`;
}

// Snap a raw interval up to a human number (1 / 2 / 2.5 / 5 / 10 × 10ⁿ)
function niceInterval(raw) {
  if (!(raw > 0)) return 1;
  const base = 10 ** Math.floor(Math.log10(raw));
  const scaled = raw / base;
  const factor = scaled <= 1 ? 1 : scaled <= 2 ? 2 : scaled <= 2.5 ? 2.5 : scaled <= 5 ? 5 : 10;
  return factor * base;
}

// An interval snapped to a human number, grown until it covers the data, dipping
// below zero whenever a bucket's profit is negative.
export function buildScale(buckets) {
  const values = buckets.flatMap(bucket => [bucket.amount, bucket.expense, bucket.profit]);
  const dataMax = Math.max(0, ...values);
  const dataMin = Math.min(0, ...values);

  let tickCount = 4;
  let interval = niceInterval((dataMax - dataMin) / tickCount) || 1;
  let min = dataMin < 0 ? -Math.ceil(-dataMin / interval) * interval : 0;
  let max = min + interval * tickCount;

  let guard = 0;
  while ((max < dataMax || min > dataMin) && guard < 8) {
    tickCount += 1;
    interval = niceInterval((dataMax - dataMin) / tickCount) || interval;
    min = dataMin < 0 ? -Math.ceil(-dataMin / interval) * interval : 0;
    max = min + interval * tickCount;
    guard += 1;
  }

  return {
    min,
    max,
    ticks: Array.from({ length: tickCount + 1 }, (_, i) => min + interval * i)
  };
}

// Plot geometry in real pixels, with one point per bucket per series.
export function buildGeometry(buckets, size, scale) {
  const plotWidth = Math.max(10, size.width - PLOT_PADDING.left - PLOT_PADDING.right);
  const plotHeight = Math.max(10, size.height - PLOT_PADDING.top - PLOT_PADDING.bottom);
  // The timeline always produces at least 6 buckets, so a span of 1 is safe
  const xFor = (index) => PLOT_PADDING.left + (index / (buckets.length - 1)) * plotWidth;
  const yFor = (value) => PLOT_PADDING.top + ((scale.max - value) / (scale.max - scale.min)) * plotHeight;

  return {
    width: size.width,
    height: size.height,
    plotWidth,
    plotHeight,
    yFor,
    baseline: yFor(0),
    barWidth: Math.min(26, Math.max(4, (plotWidth / Math.max(buckets.length, 1)) * 0.45)),
    points: buckets.map((bucket, index) => ({
      ...bucket,
      index,
      x: xFor(index),
      ySales: yFor(bucket.amount),
      yExpense: yFor(bucket.expense),
      yProfit: yFor(bucket.profit)
    }))
  };
}

// Only as many date labels as fit under the plot, aligned to real x positions
export function selectLabelPoints(points, plotWidth) {
  const maxLabels = Math.max(2, Math.floor(plotWidth / 62));
  const stride = Math.max(1, Math.ceil(points.length / maxLabels));
  const indices = [];
  for (let i = 0; i < points.length; i += stride) indices.push(i);
  const last = points.length - 1;
  if (last > 0 && indices[indices.length - 1] !== last && last - indices[indices.length - 1] >= stride / 2) {
    indices.push(last);
  }
  return indices.map(i => points[i]).filter(Boolean);
}

// Smooth cubic path through one series' points
export function smoothPath(points, key) {
  return points.reduce((path, point, index) => {
    if (index === 0) return `M ${point.x} ${point[key]}`;
    const previous = points[index - 1];
    const midX = previous.x + (point.x - previous.x) / 2;
    return `${path} C ${midX} ${previous[key]}, ${midX} ${point[key]}, ${point.x} ${point[key]}`;
  }, '');
}
