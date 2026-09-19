// The bill's money block — Sub Total, Discount, GST, Round Off, Total —
// computed once here so the checkout, the printed document and the PDF can
// never disagree.
//
// Prices are GST-inclusive: the tax line reports the GST already contained in
// the price, so configuring a rate adds the breakdown without changing a rupee
// the customer actually pays. With no discount and no rate configured, every
// figure below collapses to Sub Total = Total, exactly as before.

const round2 = (value) => Math.round((Number(value) || 0) * 100) / 100;

export const lineAmount = (item) => round2(
  item.total ?? (Number(item.quantity || 1) * Number(item.rate ?? item.retail_price ?? 0))
);

/** Invoice lines, or a single fallback line for a receipt with no item detail. */
export function invoiceItems(invoice = {}) {
  return Array.isArray(invoice.items_json) && invoice.items_json.length > 0
    ? invoice.items_json
    : [{ name: 'Store Purchase', quantity: 1, rate: invoice.amount, total: invoice.amount }];
}

/**
 * The money block for a cart about to be billed.
 * @param {Array} items - Cart lines ({ quantity, rate, total })
 * @param {Object} profile - Business profile (discountPercent, taxRate)
 */
export function computeBillTotals(items = [], profile = {}) {
  const discountPercent = Number(profile.discountPercent) || 0;
  const taxRate = Number(profile.taxRate) || 0;

  const subtotal = round2(items.reduce((sum, item) => sum + lineAmount(item), 0));
  const discount = round2((subtotal * discountPercent) / 100);
  const net = round2(subtotal - discount);
  const tax = taxRate > 0 ? round2(net - net / (1 + taxRate / 100)) : 0;
  const total = Math.round(net); // collected in whole rupees at the counter

  return {
    subtotal,
    discountPercent,
    discount,
    taxRate,
    tax,
    roundOff: round2(total - net),
    total
  };
}

/**
 * The money block for an already-saved invoice: the snapshot taken at checkout
 * when there is one, otherwise recomputed. Either way it reconciles to the
 * amount actually collected, so reprinting an old bill with new settings cannot
 * change what the customer was charged.
 */
export function billTotalsFor(invoice = {}, profile = {}) {
  const items = invoiceItems(invoice);
  const base = invoice.totals || computeBillTotals(items, profile);
  const collected = Number(invoice.amount ?? base.total) || 0;

  return {
    ...base,
    roundOff: round2(collected - (base.subtotal - base.discount)),
    total: collected
  };
}
