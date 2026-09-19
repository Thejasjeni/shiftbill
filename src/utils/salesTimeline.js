// Range windows and per-bucket sales/expense/profit math for the dashboard chart.
// Deliberately a plain module: the provider owns React state, this owns the numbers.

const DATE_LABEL = { day: 'numeric', month: 'short' };

// Bucket counts are fixed per range, so a range is always drawable and its
// bucket boundaries stay stable across renders (at least 6 buckets everywhere).
const RANGE_SPECS = {
  Today: { bucketCount: 6, labelFormat: { hour: 'numeric' } },
  'This Week': { bucketCount: 7, labelFormat: DATE_LABEL },
  'This Month': { bucketCount: 10, labelFormat: DATE_LABEL },
  'Last Month': { bucketCount: 6, labelFormat: DATE_LABEL },
  'This Quarter': { bucketCount: 10, labelFormat: DATE_LABEL }
};

const startOfDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

// The window a range covers: either a closed calendar window (Last Month, whose
// strict end keeps this month's rows out) or an open one that runs up to `now`.
export function rangeWindow(range, now = new Date()) {
  const daysAgo = (days) => startOfDay(new Date(now.getFullYear(), now.getMonth(), now.getDate() - days));

  switch (range) {
    case 'Today':
      return { start: startOfDay(now), end: null };
    case 'This Week':
      return { start: daysAgo(6), end: null };
    case 'Last Month':
      return {
        start: new Date(now.getFullYear(), now.getMonth() - 1, 1),
        end: new Date(now.getFullYear(), now.getMonth(), 1)
      };
    case 'This Quarter':
      return { start: daysAgo(89), end: null };
    case 'This Month':
    default:
      return { start: new Date(now.getFullYear(), now.getMonth(), 1), end: null };
  }
}

// Sales, expenses and profit per bucket for one range.
// A timestamp stamped slightly ahead of this device's clock (server clock skew)
// still belongs to the newest bucket rather than silently vanishing.
export function buildSalesTimeline(transactions, range, now = new Date()) {
  const spec = RANGE_SPECS[range] || RANGE_SPECS['This Month'];
  const { start, end } = rangeWindow(range, now);
  const windowStart = start.getTime();
  const windowEnd = end ? end.getTime() : now.getTime();
  const span = Math.max(windowEnd - windowStart, 1);

  const buckets = Array.from({ length: spec.bucketCount }, (_, i) => ({
    start: windowStart + (span * i) / spec.bucketCount,
    amount: 0,
    expense: 0,
    count: 0
  }));

  transactions.forEach((tx) => {
    if (tx.type !== 'sale' && tx.type !== 'expense') return;
    const time = new Date(tx.created_at || tx.date).getTime();
    if (isNaN(time) || time < windowStart) return;
    if (end && time >= windowEnd) return;
    // Bucket starts are fractional ms, so every timestamp (integer ms, as Date
    // stores them) falls in exactly one bucket; the clamp keeps a skewed
    // timestamp a little ahead of `now` in the newest bucket.
    const rawIndex = Math.floor(((time - windowStart) / span) * spec.bucketCount);
    const index = Math.min(spec.bucketCount - 1, Math.max(0, rawIndex));
    const amount = Number(tx.amount) || 0;
    if (tx.type === 'sale') {
      buckets[index].amount += amount;
      buckets[index].count += 1;
    } else {
      buckets[index].expense += amount;
    }
  });

  return buckets.map((bucket, i) => {
    const bucketStart = new Date(bucket.start);
    return {
      key: `${i}-${Math.round(bucket.start)}`,
      date: bucketStart.toLocaleString('en-IN', spec.labelFormat),
      fullDate: bucketStart.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
      amount: bucket.amount,
      expense: bucket.expense,
      profit: bucket.amount - bucket.expense,
      count: bucket.count
    };
  });
}

// Totals for the exact window the chart draws, so the header, the summary strip
// and the plotted series can never disagree.
export function summarizeTimeline(timeline) {
  return timeline.reduce((totals, bucket) => ({
    sales: totals.sales + bucket.amount,
    expense: totals.expense + bucket.expense,
    profit: totals.profit + bucket.profit,
    invoices: totals.invoices + bucket.count
  }), { sales: 0, expense: 0, profit: 0, invoices: 0 });
}
