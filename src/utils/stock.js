// The low-stock rule, in one place. Everything that shows a warning — the item
// card, the sidebar count, the POS chip — asks here, so a change to the policy
// lands in one file.

export const DEFAULT_LOW_STOCK_THRESHOLD = 5;

// Items are written with the UI shape (stock/threshold) but remote rows keep the
// column names the catalog has always used (stock_quantity / low_stock_threshold).
export function stockOf(item = {}) {
  return Number(item.stock ?? item.stock_quantity ?? 0);
}

export function thresholdOf(item = {}) {
  const value = Number(item.low_stock_threshold ?? item.threshold);
  return Number.isFinite(value) && value >= 0 ? value : DEFAULT_LOW_STOCK_THRESHOLD;
}

// 'out' beats 'low' so a card shows the stronger state when both apply.
export function stockState(item) {
  const stock = stockOf(item);
  if (stock <= 0) return 'out';
  if (stock <= thresholdOf(item)) return 'low';
  return 'ok';
}

export const isLowStock = (item) => stockState(item) !== 'ok';

export const countLowStock = (items = []) => items.filter(isLowStock).length;
