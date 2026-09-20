import React, { useMemo, useState } from 'react';
import { X, Receipt, ShoppingBag } from 'lucide-react';
import { useDashboard } from '../../context/DashboardContext';
import { useVendors } from '../../hooks/useVendors';
import { computeBillTotals } from '../../utils/billTotals';
import { selectBillableCatalogue, resolveScan } from '../../utils/posCatalogue';
import { buildInvoice } from '../../utils/billInvoice';
import useBillCart from '../../hooks/useBillCart';
import useBillDocuments from '../../hooks/useBillDocuments';
import Money from '../ui/Money';
import BarcodeScannerModal from './BarcodeScannerModal';
// The sheet owns the bill; each of these owns one piece of it.
import CustomerPicker from './checkout/CustomerPicker';
import ItemChips from './checkout/ItemChips';
import CartLine from './checkout/CartLine';
import MoneyBlock from './checkout/MoneyBlock';
import BillNotices from './checkout/BillNotices';
import SavedBill from './checkout/SavedBill';

// Taking a bill: pick the customer, tap or scan what they bought, save it, hand
// them the document. The bill's lines live in useBillCart, its documents in
// useBillDocuments, what may be billed in posCatalogue — what is left here is
// the order of those steps.
export default function CheckoutBottomSheet({ isOpen, onClose }) {
  const { currentData, addSale, businessInfo = {}, isCatalogueLoaded } = useDashboard();
  // Saved customers from the vendor registry (offline-safe: empty list when
  // unreachable — local parties below still work)
  const { vendors } = useVendors();

  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [tier, setTier] = useState('retail'); // 'retail' or 'wholesale'
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  // A scanned code that matched nothing while the catalogue was still unknown
  const [unmatchedScan, setUnmatchedScan] = useState(null);
  // The saved bill, until the next one starts
  const [invoice, setInvoice] = useState(null);

  const catalogue = useMemo(
    () => selectBillableCatalogue(currentData.items, isCatalogueLoaded),
    [currentData.items, isCatalogueLoaded]
  );
  const cart = useBillCart(catalogue, tier);
  // The money block, from the same module the printed document and the PDF use
  const bill = useMemo(() => computeBillTotals(cart.lines, businessInfo), [cart.lines, businessInfo]);
  const documents = useBillDocuments({ businessInfo, invoice, payableTotal: bill.total });

  // A zero-stock item is still billable (the count may be stale) — the cart shows
  // the warning instead of interrupting the sale.
  const handleScan = (code) => {
    const scan = resolveScan(code, catalogue, isCatalogueLoaded);
    if (scan.unknown) setUnmatchedScan(code);
    else cart.add(scan.item);
  };

  const saveBill = async () => {
    const saved = buildInvoice({
      lines: cart.lines,
      moneyBlock: bill,
      total: bill.total,
      customerName,
      customerPhone,
      tier
    });

    await addSale(saved);
    // The receipt QR is taken before the cart is cleared, which is what takes the
    // live preview QR away
    await documents.captureReceipt(saved);
    setInvoice(saved);
    // Reset entry state so the next bill starts clean (the saved bill stays on
    // screen until "New bill" or close)
    cart.clear();
    setCustomerName('');
    setCustomerPhone('');
    setTier('retail');
  };

  const startNextBill = () => {
    cart.clear();
    documents.reset();
    setInvoice(null);
    setCustomerName('');
    setCustomerPhone('');
    setTier('retail');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Slide-Up Bottom Sheet Overlay */}
      <div
        onClick={onClose}
        className="fixed inset-0 z-40 bg-scrim backdrop-blur-xs transition-opacity"
      />

      <div className="print-sheet fixed inset-x-0 bottom-0 z-50 flex max-h-[92vh] flex-col overflow-hidden rounded-t-[22px] bg-surface shadow-e3 sm:mx-auto sm:max-w-xl animate-slideUp">
        {/* Drag handle */}
        <div className="mx-auto mb-1 mt-2.5 h-1.5 w-12 cursor-grab rounded-full bg-surface-3"></div>

        {/* Sheet Header */}
        <div className="flex items-center justify-between border-b border-hairline/70 px-4 py-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-control)] bg-[var(--color-brand)] text-white shadow-e1">
              <ShoppingBag className="h-4 w-4" />
            </div>
            <div className="text-left">
              <h2 className="text-title font-bold leading-tight text-ink">
                {invoice ? 'Bill saved' : 'Take a bill'}
              </h2>
              <span className="num text-micro text-ink-muted">
                {invoice ? invoice.id : 'Tap items, take payment, save the bill'}
              </span>
            </div>
          </div>
          <button
            onClick={invoice ? startNextBill : onClose}
            aria-label={invoice ? 'Close and start a new bill' : 'Close checkout'}
            className="rounded-full p-1.5 text-ink-subtle transition-colors hover:bg-surface-2 hover:text-ink cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Sheet Content Body */}
        <div className="print-sheet-body flex-1 space-y-4 overflow-y-auto p-4 text-left">
          {invoice ? (
            /* THE BILL: confirmation chrome on screen, invoice document on paper */
            <SavedBill
              invoice={invoice}
              businessInfo={businessInfo}
              qrUrl={documents.receiptQrUrl}
              isGeneratingPdf={documents.isGeneratingPdf}
              pdfError={documents.pdfError}
              onShare={() => documents.shareOnWhatsApp(customerPhone)}
              onDownload={documents.downloadPdf}
              onPrint={documents.printBill}
              onNewBill={startNextBill}
            />
          ) : (
            /* ACTIVE CART & CHECKOUT FORM */
            <>
              <CustomerPicker
                parties={currentData.parties}
                vendors={vendors}
                name={customerName}
                phone={customerPhone}
                onNameChange={setCustomerName}
                onPhoneChange={setCustomerPhone}
                tier={tier}
                onTierChange={setTier}
              />

              <ItemChips
                items={catalogue}
                isCatalogueLoaded={isCatalogueLoaded}
                tier={tier}
                onAdd={cart.add}
                onScan={() => setIsScannerOpen(true)}
              />

              {/* The bill's lines — each row is a CartLine; the sheet owns the list */}
              <div className="overflow-hidden rounded-[var(--radius-card)] bg-surface ring-1 ring-hairline/70">
                <div className="flex justify-between border-b border-hairline/70 bg-surface-2 px-3 py-2 text-micro font-bold uppercase text-ink-muted">
                  <span>Item</span>
                  <span>Qty & amount</span>
                </div>

                {cart.lines.length === 0 ? (
                  <p className="p-6 text-center text-micro text-ink-subtle">
                    Your cart is empty — scan a barcode or tap an item above.
                  </p>
                ) : (
                  <div className="divide-y divide-hairline/70">
                    {cart.lines.map((line) => (
                      <CartLine
                        key={line.id}
                        item={line}
                        onQty={cart.setQty}
                        onRemove={cart.remove}
                      />
                    ))}
                  </div>
                )}
              </div>

              <MoneyBlock bill={bill} total={bill.total} qrUrl={documents.previewQrUrl} />

              <BillNotices
                lines={cart.lines}
                catalogue={catalogue}
                unmatchedScan={unmatchedScan}
                isCatalogueLoaded={isCatalogueLoaded}
              />

              {/* Checkout Action Button */}
              <button
                disabled={cart.lines.length === 0}
                onClick={saveBill}
                className="flex w-full items-center justify-center gap-2 rounded-[var(--radius-card)] bg-[var(--color-in)] py-3.5 text-body font-bold text-white shadow-e2 transition-all hover:opacity-95 active:scale-[0.99] disabled:opacity-45 cursor-pointer"
              >
                <Receipt className="h-4 w-4" />
                <span>Save bill &amp; make invoice</span>
                {bill.total > 0 && <Money value={bill.total} className="text-white" />}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Barcode Scanner Modal */}
      <BarcodeScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScanSuccess={handleScan}
      />
    </>
  );
}
