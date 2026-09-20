// The record a sale becomes — the one shape that reaches the ledger, built in one
// place so every field a reprint depends on is written the same way.

export function buildInvoice({ lines, moneyBlock, total, customerName = '', customerPhone = '', tier }) {
  return {
    id: `INV-${Math.floor(100000 + Math.random() * 900000)}`,
    date: new Date().toLocaleDateString('en-IN'),
    amount: total,
    party_name: customerName.trim() || 'Cash Customer',
    customer_phone: customerPhone.trim(),
    pricing_tier: tier,
    payment_mode: 'Cash',
    // Snapshot the money block so a reprint can never disagree with what the
    // customer was charged, even if the settings change later
    totals: moneyBlock,
    items_json: lines
  };
}
