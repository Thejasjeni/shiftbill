import React from 'react';
import { CheckCircle2, FileDown, Printer, Share2 } from 'lucide-react';
import Money from '../../ui/Money';
import Notice from '../../ui/Notice';
import InvoiceDocument from '../InvoiceDocument';

// The bill once it is saved: what was paid, the document itself, and the ways to
// hand it to the customer. The document is the only thing that prints, so the
// actions sit outside it.
export default function SavedBill({
  invoice,
  businessInfo,
  qrUrl,
  isGeneratingPdf,
  pdfError,
  onShare,
  onDownload,
  onPrint,
  onNewBill
}) {
  return (
    <div className="space-y-4">
      <div className="text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-brand)]/10 text-[var(--color-in)]">
          <CheckCircle2 className="h-7 w-7 stroke-[2.5]" />
        </div>
        <h3 className="mt-2 text-title font-black text-ink">
          <Money value={invoice.amount} /> paid
        </h3>
        <p className="mt-0.5 text-micro text-ink-muted">
          Billed to <strong className="text-ink">{invoice.party_name}</strong> · {invoice.pricing_tier} price list
        </p>
      </div>

      {/* The invoice document — .print-area is what reaches paper */}
      <div className="print-area overflow-hidden rounded-[var(--radius-card)] ring-1 ring-hairline/70">
        <InvoiceDocument invoice={invoice} business={businessInfo} qrDataUrl={qrUrl} />
      </div>

      {/* Delivery actions: kept outside .print-area so they never print */}
      <div className="space-y-2.5 pt-1">
        <button
          onClick={onShare}
          className="flex w-full items-center justify-center gap-2 rounded-[var(--radius-control)] bg-[var(--color-in)] py-3 text-body font-bold text-white shadow-e2 transition-transform hover:opacity-95 active:scale-[0.98] cursor-pointer"
        >
          <Share2 className="h-4 w-4" />
          <span>Send bill on WhatsApp</span>
        </button>

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={onDownload}
            disabled={isGeneratingPdf}
            className="flex items-center justify-center gap-1.5 rounded-[var(--radius-control)] bg-surface py-2.5 text-micro font-semibold text-ink ring-1 ring-hairline/70 transition-colors hover:bg-surface-2 disabled:opacity-60 cursor-pointer"
          >
            <FileDown className="h-4 w-4 text-[var(--color-brand)]" />
            <span>{isGeneratingPdf ? 'Generating…' : 'Download PDF'}</span>
          </button>

          <button
            onClick={onPrint}
            className="flex items-center justify-center gap-1.5 rounded-[var(--radius-control)] bg-surface py-2.5 text-micro font-semibold text-ink ring-1 ring-hairline/70 transition-colors hover:bg-surface-2 cursor-pointer"
          >
            <Printer className="h-4 w-4 text-ink-muted" />
            <span>Print bill</span>
          </button>
        </div>

        {pdfError && (
          <Notice tone="danger" role="alert">
            {pdfError}
          </Notice>
        )}

        <button
          onClick={onNewBill}
          className="w-full py-2.5 text-micro font-bold text-[var(--color-brand)] hover:underline cursor-pointer"
        >
          + New bill
        </button>
      </div>
    </div>
  );
}
