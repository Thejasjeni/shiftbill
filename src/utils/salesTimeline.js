// Range registry and per-bucket sales/expense/profit math for the dashboard chart.
// Deliberately a plain module: the provider owns React state, this owns the numbers.

const DATE_LABEL = { day: 'numeric', month: 'short' };

const startOfDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
const startOfMonth = (date) => new Date(date.getFullYear(), date.getMonth(), 1);
// Monday-based week, so "This Week" is a real calendar week
const startOfWeek = (date) => startOfDay(new Date(date.getFullYear(), date.getMonth(), date.getDate() - ((date.getDay() + 6) % 7)));
const startOfQuarter = (date) => new Date(date.getFullYear(), Math.floor(date.getMonth() / 3) * 3, 1);

// Even buckets across the window
const evenBuckets = (count) => (start, end) => Array.from({ length: count }, (_, i) => start + ((end - start) * i) / count);

// One bucket per local day, so a part-finished week still means one bar per day
function dayBuckets(start, end) {
  const edges = [];
  for (let day = new Date(start); day.getTime() < end; day.setDate(day.getDate() + 1)) {
    edges.push(day.getTime());
  }
  return edges.length ? edges : [start];
}

// The registry is the single owner of which ranges exist, what each covers, how it
// is bucketed and how it is labelled. Windows are local-time: "This Week" is the
// current Monday-Sunday week and "This Quarter" the current calendar quarter, both
// read up to `now`; "Last Month" is a closed window that keeps this month's rows
// out. A timestamp a little ahead of this device's clock (server clock skew) still
// lands in the newest bucket rather than vanishing.
const RANGE_SPECS = {
  Today: {
    labelFormat: { hour: 'numeric' },
    window: (now) => ({ start: startOfDay(now), end: null }),
    buckets: evenBuckets(6)
  },
  'This Week': {
    labelFormat: DATE_LABEL,
    window: (now) => ({ start: startOfWeek(now), end: null }),
    buckets: dayBuckets
  },
  'This Month': {
    labelFormat: DATE_LABEL,
    window: (now) => ({ start: startOfMonth(now), end: null }),
    buckets: evenBuckets(10)
  },
  'Last Month': {
    labelFormat: DATE_LABEL,
    window: (now) => ({ start: new Date(now.getFullYear(), now.getMonth() - 1, 1), end: startOfMonth(now) }),
    buckets: evenBuckets(6)
  },
  'This Quarter': {
    labelFormat: DATE_LABEL,
    window: (now) => ({ start: startOfQuarter(now), end: null }),
    buckets: evenBuckets(10)
  }
};

// The dropdown options and the provider's starting range both come from here, so
// the range list cannot drift out of step with the registry.
export const RANGE_LABELS = Object.keys(RANGE_SPECS);
export const DEFAULT_RANGE = 'This Month';

// Sales, expenses and profit per bucket for one range. Purchases are stock-in, so
// they are neither revenue nor a cost of sales.
export function buildSalesTimeline(transactions, range, now = new Date()) {
  const spec = RANGE_SPECS[range];
  if (!spec) throw new Error(`Unknown chart range: ${range}`);

  const { start, end } = spec.window(now);
  const windowStart = start.getTime();
  const windowEnd = end ? end.getTime() : now.getTime();
  const edges = spec.buckets(windowStart, windowEnd);
  const buckets = edges.map((edge, i) => ({
    start: edge,
    end: i + 1 < edges.length ? edges[i + 1] : Math.max(windowEnd, edge + 1),
    amount: 0,
    expense: 0,
    count: 0
  }));

  transactions.forEach((tx) => {
    if (tx.type !== 'sale' && tx.type !== 'expense') return;
    const time = new Date(tx.created_at || tx.date).getTime();
    if (isNaN(time) || time < windowStart) return;
    if (end && time >= windowEnd) return;
    // Buckets are not all the same width (This Week is one bucket per day), so the
    // bucket is the first one whose span still contains the timestamp; a skewed
    // timestamp ahead of `now` clamps into the newest bucket.
    let index = buckets.length - 1;
    for (let i = 0; i < buckets.length; i += 1) {
      if (time < buckets[i].end) {
        index = i;
        break;
      }
    }
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

// The same range one period earlier, for "up 12% vs last period" pills.
//
// Deliberately NOT built by re-running buildSalesTimeline: the current ranges are
// open-ended ("to date"), and that function's clock-skew rule clamps anything
// after the window into the newest bucket — so a previous window computed that
// way silently absorbs the current period and every comparison reads as 0%.
// This totals a closed [previousStart, currentStart) window instead. Both edges
// come from the registry, so a range's definition still has one owner.
export function previousRangeTotals(transactions, range, now = new Date()) {
  const spec = RANGE_SPECS[range];
  if (!spec) throw new Error(`Unknown chart range: ${range}`);

  const windowEnd = spec.window(now).start.getTime();
  const previousStart = spec.window(new Date(windowEnd - 1)).start.getTime();

  const totals = transactions.reduce((acc, tx) => {
    if (tx.type !== 'sale' && tx.type !== 'expense') return acc;
    const time = new Date(tx.created_at || tx.date).getTime();
    if (isNaN(time) || time < previousStart || time >= windowEnd) return acc;
    const amount = Number(tx.amount) || 0;
    if (tx.type === 'sale') {
      acc.sales += amount;
      acc.invoices += 1;
    } else {
      acc.expense += amount;
    }
    return acc;
  }, { sales: 0, expense: 0, profit: 0, invoices: 0 });

  totals.profit = totals.sales - totals.expense;
  return totals;
}
