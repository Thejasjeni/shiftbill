// The app's money policy, in one plain module: how a rupee amount is grouped,
// how many decimals it keeps and which minus sign it uses. Everything that
// prints money — the Money component, the chart, reports, the PDF and the
// WhatsApp message — reads it here, so one value can never print two ways.
//
// Two functions rather than one because some destinations cannot draw ₹:
// jsPDF's built-in fonts and WhatsApp's plain-text preview only carry the
// symbol when the platform supplies it, so those callers prepend "Rs. " and
// take the bare number.

const SYMBOL = '₹';
const MINUS = '−'; // U+2212, the width-matched minus — not a hyphen

const GROUPED = new Intl.NumberFormat('en-IN', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2
});

/**
 * Screen money: symbol included, negatives carry the real minus sign.
 * @param {number} value
 */
export function formatINR(value) {
  const amount = Number(value) || 0;
  return `${amount < 0 ? MINUS : ''}${SYMBOL}${GROUPED.format(Math.abs(amount))}`;
}

/**
 * Bare grouped amount for destinations that carry their own currency prefix
 * ("Rs. " in the PDF, the WhatsApp text, CSV). Pass `decimals` to fix the
 * precision — the printed bill always shows two — and leave it out to keep the
 * natural 0-to-2 the screen uses.
 * @param {number} value
 * @param {number} [decimals]
 */
export function formatAmount(value, decimals) {
  const amount = Number(value) || 0;
  if (decimals === undefined) return GROUPED.format(amount);
  return amount.toLocaleString('en-IN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
}
