import React from 'react';
import { DEFAULT_BUSINESS_INFO } from '../../data/businessProfile';
import { billTotalsFor, invoiceItems, lineAmount } from '../../utils/billTotals';

// What every bill says at the bottom. Kept here so a printed invoice never
// carries app branding — this is the business's own stationery.
const NOTES = 'Thank you for your business.';
const TERMS = 'Goods once sold are not returnable. Please retain this invoice for your records.';

const money = (value) => `₹${Number(value || 0).toLocaleString('en-IN', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
})}`;

/**
 * The bill itself: business header, billed party, line items, totals, payment
 * QR and the closing notes. Rendered on screen after checkout and on paper by
 * the thermal print styles (see .print-area in index.css).
 */
export default function InvoiceDocument({ invoice, business = {}, qrDataUrl = null }) {
  if (!invoice) return null;

  const profile = { ...DEFAULT_BUSINESS_INFO, ...business };
  const items = invoiceItems(invoice);
  const totals = billTotalsFor(invoice, profile);

  return (
    <article className="w-full bg-white px-4 py-5 text-left text-slate-900 sm:px-6 sm:py-6">
      {/* Logo, business details and the invoice title */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <img
            src={profile.logo}
            alt={profile.name}
            className="mb-2.5 h-12 w-auto object-contain"
          />
          <h2 className="text-base font-black tracking-tight text-slate-900">{profile.name}</h2>
          {profile.city && <p className="text-[10px] leading-relaxed text-slate-500">{profile.city}</p>}
          {profile.gstin && <p className="text-[10px] leading-relaxed text-slate-500">GSTIN: {profile.gstin}</p>}
          {profile.phone && <p className="text-[10px] leading-relaxed text-slate-500">Ph: {profile.phone}</p>}
        </div>

        <div className="sm:text-right">
          <h1 className="text-xl font-black tracking-[0.18em] text-indigo-900">INVOICE</h1>
          <p className="text-[11px] font-semibold text-slate-500"># {invoice.id || 'INV-001'}</p>
          <div className="mt-2 inline-block rounded-lg bg-slate-100 px-3 py-1.5">
            <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Total Payable</p>
            <p className="text-sm font-black text-slate-900">{money(totals.total)}</p>
          </div>
        </div>
      </header>

      <div className="my-4 h-px bg-slate-200" />

      {/* Billed party and the invoice's own dates */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Bill To</p>
          <p className="text-sm font-bold text-slate-900">{invoice.party_name || 'Cash Customer'}</p>
          {invoice.customer_phone && <p className="text-[11px] text-slate-500">+91 {invoice.customer_phone}</p>}
          <p className="text-[11px] capitalize text-slate-500">{invoice.pricing_tier || 'retail'} price list</p>
        </div>

        <dl className="w-full shrink-0 overflow-hidden rounded-lg border border-slate-200 sm:w-52">
          <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-2.5 py-1.5">
            <dt className="text-[10px] font-semibold text-slate-500">Invoice Date</dt>
            <dd className="text-[10px] font-bold text-slate-800">{invoice.date || '—'}</dd>
          </div>
          <div className="flex items-center justify-between gap-2 px-2.5 py-1.5">
            <dt className="text-[10px] font-semibold text-slate-500">Payment Mode</dt>
            <dd className="text-[10px] font-bold text-slate-800">{invoice.payment_mode || 'Cash'}</dd>
          </div>
        </dl>
      </div>

      {/* Line items */}
      <table className="mt-4 w-full border-collapse">
        <thead>
          <tr className="bg-indigo-900 text-white">
            <th className="w-7 px-1.5 py-1.5 text-[9px] font-bold">#</th>
            <th className="px-1.5 py-1.5 text-left text-[9px] font-bold uppercase tracking-wider">Item &amp; Description</th>
            <th className="w-9 px-1.5 py-1.5 text-[9px] font-bold uppercase">Qty</th>
            <th className="w-16 px-1.5 py-1.5 text-right text-[9px] font-bold uppercase">Rate</th>
            <th className="w-20 px-1.5 py-1.5 text-right text-[9px] font-bold uppercase">Amount</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, index) => (
            <tr key={`${item.id || item.name}-${index}`} className="border-b border-slate-100 align-top">
              <td className="px-1.5 py-2 text-[10px] text-slate-500">{index + 1}</td>
              <td className="px-1.5 py-2">
                <span className="block text-[11px] font-semibold text-slate-800">
                  {item.name || item.item_name || 'Item'}
                </span>
                {item.code && <span className="block text-[9px] text-slate-400">Code: {item.code}</span>}
              </td>
              <td className="px-1.5 py-2 text-center text-[10px] font-semibold text-slate-700">
                {item.quantity || 1}
              </td>
              <td className="px-1.5 py-2 text-right text-[10px] text-slate-600">
                {money(item.rate ?? item.retail_price ?? 0)}
              </td>
              <td className="px-1.5 py-2 text-right text-[10px] font-bold text-slate-800">
                {money(lineAmount(item))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Money block: Sub Total, Discount, GST, Round Off, Total */}
      <div className="mt-3 flex justify-end">
        <div className="w-full space-y-1 sm:w-60">
          <div className="flex items-center justify-between text-[11px] text-slate-600">
            <span>Sub Total</span>
            <span className="font-semibold">{money(totals.subtotal)}</span>
          </div>
          {totals.discount > 0 && (
            <div className="flex items-center justify-between text-[11px] text-slate-600">
              <span>Discount ({totals.discountPercent}%)</span>
              <span className="font-semibold text-rose-600">(−) {money(totals.discount)}</span>
            </div>
          )}
          {totals.tax > 0 && (
            <div className="flex items-center justify-between text-[11px] text-slate-600">
              <span>GST @ {totals.taxRate}% (included)</span>
              <span className="font-semibold">{money(totals.tax)}</span>
            </div>
          )}
          {totals.roundOff !== 0 && (
            <div className="flex items-center justify-between text-[11px] text-slate-600">
              <span>Round Off</span>
              <span className="font-semibold">{totals.roundOff > 0 ? '+' : '−'} {money(Math.abs(totals.roundOff))}</span>
            </div>
          )}
          <div className="flex items-center justify-between rounded-md bg-slate-100 px-2.5 py-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wide text-slate-700">Total</span>
            <span className="text-sm font-black text-slate-900">{money(totals.total)}</span>
          </div>
        </div>
      </div>

      {/* Pay by UPI — only when the business has a VPA to collect into */}
      {qrDataUrl && (
        <div className="mt-4 flex items-center gap-3 rounded-lg border border-slate-200 p-3">
          <img
            src={qrDataUrl}
            alt={`UPI QR code to pay ${money(totals.total)}`}
            className="h-20 w-20 shrink-0 rounded border border-slate-200 bg-white"
          />
          <div className="min-w-0 text-[10px] leading-relaxed">
            <p className="font-bold uppercase tracking-wider text-indigo-900">Scan &amp; pay {money(totals.total)}</p>
            {profile.upiId && <p className="truncate font-mono font-semibold text-slate-700">UPI: {profile.upiId}</p>}
            <p className="text-slate-400">GPay / PhonePe / Paytm / BHIM</p>
          </div>
        </div>
      )}

      {/* Closing notes */}
      <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
        <div className="rounded-lg border border-slate-200 p-2.5">
          <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Notes</p>
          <p className="text-[10px] leading-relaxed text-slate-600">{NOTES}</p>
        </div>
        <div className="rounded-lg border border-slate-200 p-2.5">
          <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Terms &amp; Conditions</p>
          <p className="text-[10px] leading-relaxed text-slate-600">{TERMS}</p>
        </div>
      </div>

      <p className="mt-4 text-center text-[9px] font-semibold text-slate-400">
        {profile.name} • {invoice.id}
      </p>
    </article>
  );
}
