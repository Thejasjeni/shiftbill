// Range windows and per-bucket sales/expense/profit math for the dashboard chart.
// Deliberately a plain module: the provider owns React state, this owns the numbers.

const DATE_LABEL = { day: 'numeric', month: 'short' };
const startOfDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
const startOfMonth = (date) => new Date(date.getFullYear(), date.getMonth(), 1);
const daysBefore = (date, days) => startOfDay(new Date(date.getFullYear(), date.getMonth(), date.getDate() - days));

// Each range is defined once: its window, its bucket count and its label format.
// Bucket counts are fixed, so a range is always drawable and its boundaries stay
// stable across renders (at least 6 buckets everywhere). A closed window (Last
// Month) keeps its neighbouring months out; open windows run up to `now`, where a
// timestamp a little ahead of this device's clock (server clock skew) still
// belongs to the newest bucket rather than silently vanishing.
const RANGE_SPECS = {
  Today: {
    bucketCount: 6,
    labelFormat: { hour: 'numeric' },
    window: (now) => ({ start: startOfDay(now), end: null })
  },
  'This Week': {
    bucketCount: 7,
    labelFormat: DATE_LABEL,
    window: (now) => ({ start: daysBefore(now, 6), end: null })
  },
  'This Month': {
    bucketCount: 10,
    labelFormat: DATE_LABEL,
    window: (now) => ({ start: startOfMonth(now), end: null })
  },
  'Last Month': {
    bucketCount: 6,
    labelFormat: DATE_LABEL,
    window: (now) => ({ start: new Date(now.getFullYear(), now.getMonth() - 1, 1), end: startOfMonth(now) })
  },
  'This Quarter': {
    bucketCount: 10,
    labelFormat: DATE_LABEL,
    window: (now) => ({ start: daysBefore(now, 89), end: null })
  }
};

const specFor = (range) => RANGE_SPECS[range] || RANGE_SPECS['This Month'];

// Sales, expenses and profit per bucket for one range.
export function buildSalesTimeline(transactions, range, now = new Date()) {
  const spec = specFor(range);
  const { start, end } = spec.window(now);
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
