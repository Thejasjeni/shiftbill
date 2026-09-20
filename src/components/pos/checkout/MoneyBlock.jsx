import React from 'react';
import Money from '../../ui/Money';

// Sub total → discount → included GST → round off → total, plus the UPI preview.
// The figures come from computeBillTotals, the same function the printed
// document and the PDF use, so the screen can never disagree with the paper.
export default function MoneyBlock({ bill, total, qrUrl }) {
  if (!(total > 0)) return null;

  return (
    <div className="rounded-[var(--radius-card)] bg-[var(--color-brand)]/6 p-3 ring-1 ring-[var(--color-brand)]/12">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-0.5 text-micro text-ink-muted">
          <Row label="Sub total">
            <Money value={bill.subtotal} tone="muted" className="text-ink" />
          </Row>

          {bill.discount > 0 && (
            <Row label={`Discount (${bill.discountPercent}%)`}>
              <span className="num font-semibold text-[var(--color-out)]">
                (−) <Money value={bill.discount} tone="out" className="font-semibold" />
              </span>
            </Row>
          )}

          {bill.tax > 0 && (
            <Row label={`GST @ ${bill.taxRate}% (included)`}>
              <Money value={bill.tax} tone="muted" className="text-ink" />
            </Row>
          )}

          {bill.roundOff !== 0 && (
            <Row label="Round off">
              <span className="num font-semibold text-ink">
                {bill.roundOff > 0 ? '+' : '−'} <Money value={Math.abs(bill.roundOff)} className="font-semibold" />
              </span>
            </Row>
          )}
        </div>

        <div className="shrink-0 text-right">
          <div className="text-micro font-bold uppercase tracking-wider text-[var(--color-brand)]">
            Total
          </div>
          <Money value={total} className="text-title font-black text-ink" />
        </div>
      </div>

      {qrUrl && (
        <div className="mt-2.5 flex items-center gap-2 border-t border-[var(--color-brand)]/12 pt-2.5">
          {/* QR must stay light regardless of theme, or scanners fail */}
          <img
            src={qrUrl}
            alt="UPI payment QR for this bill"
            className="h-12 w-12 rounded-lg border border-hairline/70 bg-white p-0.5"
          />
          <div className="text-left text-micro text-ink-muted">
            <span className="block font-bold text-[var(--color-brand)]">Scan to pay by UPI</span>
            <span>Auto-filled for <Money value={total} tone="muted" className="font-semibold text-ink" /></span>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, children }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span>{label}</span>
      {children}
    </div>
  );
}
