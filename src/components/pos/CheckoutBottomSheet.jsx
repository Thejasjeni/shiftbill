import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Receipt,
  Printer,
  Share2,
  FileDown,
  CheckCircle2,
  ShoppingBag,
  AlertTriangle
} from 'lucide-react';
import { useDashboard } from '../../context/DashboardContext';
import { useVendors } from '../../hooks/useVendors';
import { DEFAULT_BUSINESS_INFO } from '../../data/businessProfile';
import { computeBillTotals } from '../../utils/billTotals';
import { stockState } from '../../utils/stock';
import { generateUpiQrCodeDataUrl, generateInvoicePdf, shareInvoiceOnWhatsApp, invoiceFileName } from '../../utils/posUtilities';
import Money from '../ui/Money';
import BarcodeScannerModal from './BarcodeScannerModal';
import InvoiceDocument from './InvoiceDocument';
// The sheet owns the bill; these own one piece of it each.
import CustomerPicker from './checkout/CustomerPicker';
import ItemChips from './checkout/ItemChips';
import CartLine from './checkout/CartLine';
import MoneyBlock from './checkout/MoneyBlock';

// Demo inventory used until the merchant adds real items (stable identity,
// defined at module scope so it doesn't break memoization below).
const FALLBACK_INVENTORY = [
  { id: '1', item_name: 'Basmati Rice Premium 5kg', retail_price: 550, wholesale_price: 470, barcode: '8901234567890', stock: 45 },
  { id: '2', item_name: 'Cold Pressed Coconut Oil 1L', retail_price: 320, wholesale_price: 260, barcode: '8909876543210', stock: 80 },
  { id: '3', item_name: 'Organic Atta Flour 10kg', retail_price: 460, wholesale_price: 395, barcode: '8904567890123', stock: 60 }
];

export default function CheckoutBottomSheet({ isOpen, onClose }) {
  const { currentData, addSale, businessInfo = {} } = useDashboard();
  // Saved customers from the Firestore vendor registry (offline-safe: empty list
  // when unreachable — local parties below still work)
  const { vendors } = useVendors();

  // What the bill is written from (blank name bills as "Cash Customer")
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [pricingTier, setPricingTier] = useState('retail'); // 'retail' or 'wholesale'

  // Cart line items (raw; display rates are derived from pricingTier below)
  const [rawCart, setCart] = useState([]);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [upiQrUrl, setUpiQrUrl] = useState(null);
  const [isCompleted, setIsCompleted] = useState(false);
  const [completedInvoice, setCompletedInvoice] = useState(null);
  const [receiptQrUrl, setReceiptQrUrl] = useState(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [pdfError, setPdfError] = useState(null);
  // Available inventory list from context or offline cache
  // (fallback is a stable module-level constant so its identity never changes)
  const inventoryItems = currentData.items.length > 0 ? currentData.items : FALLBACK_INVENTORY;

  // Auto-apply dual pricing: rates are derived at render from the item's
  // OWN stored prices (not the previous rate), so switching tiers is
  // idempotent — no compounding 0.85 multipliers, no stale-deps drift.
  const cart = useMemo(() => {
    const getRate = (item, tier) => {
      const invItem = inventoryItems.find(i => i.id === item.id || i.item_name === item.name);
      if (tier === 'wholesale') {
        return Number(invItem?.wholesale_price ?? item.wholesale_price ?? (item.retail_price || item.price || 0) * 0.85) || 0;
      }
      return Number(invItem?.retail_price ?? item.retail_price ?? item.price ?? item.rate ?? 0) || 0;
    };
    return rawCart.map(item => {
      const rate = getRate(item, pricingTier);
      return { ...item, rate, total: rate * item.quantity };
    });
  }, [rawCart, pricingTier, inventoryItems]);

  // The money block for this bill — sub total, discount, GST, round off, total
  // — from the same module the printed document and the PDF use.
  const bill = useMemo(() => computeBillTotals(cart, businessInfo), [cart, businessInfo]);
  const payableTotal = bill.total;

  // Lines the catalogue says have no stock left. Derived from the bill itself,
  // so the warning appears the moment the line is added and clears when it is
  // removed — the seller still decides, it just isn't a surprise later.
  const outOfStock = cart.filter((line) => {
    const item = inventoryItems.find((i) => i.id === line.id);
    return item && stockState(item) === 'out';
  });

  // Dynamic merchant UPI ID & Business Info from Context (no QR without a VPA)
  const merchantUpiId = businessInfo.upiId || '';
  const merchantName = businessInfo.name || DEFAULT_BUSINESS_INFO.name;

  // Update dynamic UPI QR code whenever total changes (guard against
  // out-of-order async resolution after rapid total changes)
  useEffect(() => {
    let cancelled = false;
    if (payableTotal > 0 && merchantUpiId) {
      generateUpiQrCodeDataUrl(merchantUpiId, merchantName, payableTotal, 'INV-PREVIEW')
        .then(url => { if (!cancelled) setUpiQrUrl(url); });
    } else {
      setUpiQrUrl(null);
    }
    return () => { cancelled = true; };
  }, [payableTotal, merchantUpiId, merchantName]);

  // The browser writes document.title into its printed page header and into the
  // save-as filename, so the bill borrows the page title while it is on screen
  useEffect(() => {
    if (!isCompleted || !completedInvoice) return;
    const previousTitle = document.title;
    document.title = `${merchantName} — ${completedInvoice.id}`;
    return () => { document.title = previousTitle; };
  }, [isCompleted, completedInvoice, merchantName]);

  // Add item to cart: store the item's own prices; the derived `cart`
  // recomputes rate/total from the current tier, so no manual math here.
  // A zero-stock item is still billable (the count may be stale) — the cart
  // shows the warning above the save button instead of interrupting the sale.
  const addItemToCart = (item) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === item.id);
      if (existing) {
        return prev.map(i =>
          i.id === item.id
            ? { ...i, quantity: i.quantity + 1 }
            : i
        );
      }
      return [
        ...prev,
        {
          id: item.id,
          name: item.item_name || item.name,
          retail_price: Number(item.retail_price || item.price || 0),
          wholesale_price: Number(item.wholesale_price || (item.retail_price || item.price || 0) * 0.85),
          quantity: 1
        }
      ];
    });
  };

  // Remove a cart line entirely
  const removeCartItem = (id) => {
    setCart(prev => prev.filter(i => i.id !== id));
  };

  // Update quantity
  const updateQty = (id, delta) => {
    setCart(prev =>
      prev
        .map(i => {
          if (i.id === id) {
            const newQty = i.quantity + delta;
            return newQty > 0 ? { ...i, quantity: newQty } : null;
          }
          return i;
        })
        .filter(Boolean)
    );
  };

  // Barcode scanned callback
  const handleBarcodeScanned = (scannedCode) => {
    const found = inventoryItems.find(
      i => i.barcode === scannedCode || i.code === scannedCode
    );

    if (found) {
      addItemToCart(found);
    } else {
      // Create ad-hoc item with scanned code
      addItemToCart({
        id: `scanned-${Date.now()}`,
        item_name: `Scanned Item (${scannedCode.slice(-6)})`,
        retail_price: 150,
        wholesale_price: 120,
        barcode: scannedCode
      });
    }
  };

  // Complete checkout & record sale in Firestore (queued locally when offline)
  const handleCheckout = async () => {
    const invoice = {
      id: `INV-${Math.floor(100000 + Math.random() * 900000)}`,
      date: new Date().toLocaleDateString('en-IN'),
      amount: payableTotal,
      party_name: customerName.trim() || 'Cash Customer',
      customer_phone: customerPhone.trim(),
      pricing_tier: pricingTier,
      payment_mode: 'Cash',
      // Snapshot the money block so a reprint can never disagree with what the
      // customer was charged, even if the settings change later
      totals: bill,
      items_json: cart
    };

    // Save to the local cache and Firestore
    await addSale(invoice);
    // Snapshot the exact-amount QR for the receipt BEFORE resetting the
    // cart state (which clears the live preview QR)
    const receiptQr = payableTotal > 0 && merchantUpiId
      ? await generateUpiQrCodeDataUrl(merchantUpiId, merchantName, payableTotal, invoice.id)
      : null;
    setReceiptQrUrl(receiptQr);
    setCompletedInvoice(invoice);
    setIsCompleted(true);
    // Reset entry state so the next bill starts clean (keeps the receipt
    // visible until the user taps "New Bill" or closes)
    setCart([]);
    setCustomerName('');
    setCustomerPhone('');
    setPricingTier('retail');
  };

  // Download PDF
  const handleDownloadPdf = async () => {
    if (!completedInvoice) return;
    setIsGeneratingPdf(true);
    setPdfError(null);
    try {
      const doc = await generateInvoicePdf(completedInvoice, businessInfo);
      doc.save(`${invoiceFileName(completedInvoice, businessInfo)}.pdf`);
    } catch (e) {
      console.error(e);
      setPdfError('Could not make the PDF. Try again, or print the bill instead.');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // WhatsApp Share
  const handleWhatsAppShare = () => {
    if (!completedInvoice) return;
    shareInvoiceOnWhatsApp(customerPhone, completedInvoice, businessInfo);
  };

  // Thermal Print: scope the print to the receipt area (see .print-area in index.css)
  const handleThermalPrint = () => {
    window.print();
  };

  const handleReset = () => {
    setCart([]);
    setIsCompleted(false);
    setCompletedInvoice(null);
    setReceiptQrUrl(null);
    setCustomerName('');
    setCustomerPhone('');
    setPricingTier('retail');
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
                {isCompleted ? 'Bill saved' : 'Take a bill'}
              </h2>
              <span className="num text-micro text-ink-muted">
                {isCompleted ? completedInvoice?.id : 'Tap items, take payment, save the bill'}
              </span>
            </div>
          </div>
          <button
            onClick={isCompleted ? handleReset : onClose}
            aria-label={isCompleted ? 'Close and start a new bill' : 'Close checkout'}
            className="rounded-full p-1.5 text-ink-subtle transition-colors hover:bg-surface-2 hover:text-ink cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Sheet Content Body */}
        <div className="print-sheet-body flex-1 space-y-4 overflow-y-auto p-4 text-left">
          {isCompleted ? (
            /* THE BILL: confirmation chrome on screen, invoice document on paper */
            <div className="space-y-4">
              <div className="text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-brand)]/10 text-[var(--color-in)]">
                  <CheckCircle2 className="h-7 w-7 stroke-[2.5]" />
                </div>
                <h3 className="mt-2 text-title font-black text-ink">
                  <Money value={completedInvoice.amount} /> paid
                </h3>
                <p className="mt-0.5 text-micro text-ink-muted">
                  Billed to <strong className="text-ink">{completedInvoice.party_name}</strong> · {completedInvoice.pricing_tier} price list
                </p>
              </div>

              {/* The invoice document — .print-area is what reaches paper */}
              <div className="print-area overflow-hidden rounded-[var(--radius-card)] ring-1 ring-hairline/70">
                <InvoiceDocument
                  invoice={completedInvoice}
                  business={businessInfo}
                  qrDataUrl={receiptQrUrl}
                />
              </div>

              {/* Delivery actions: kept outside .print-area so they never print */}
              <div className="space-y-2.5 pt-1">
                <button
                  onClick={handleWhatsAppShare}
                  className="flex w-full items-center justify-center gap-2 rounded-[var(--radius-control)] bg-[var(--color-in)] py-3 text-body font-bold text-white shadow-e2 transition-transform hover:opacity-95 active:scale-[0.98] cursor-pointer"
                >
                  <Share2 className="h-4 w-4" />
                  <span>Send bill on WhatsApp</span>
                </button>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={handleDownloadPdf}
                    disabled={isGeneratingPdf}
                    className="flex items-center justify-center gap-1.5 rounded-[var(--radius-control)] bg-surface py-2.5 text-micro font-semibold text-ink ring-1 ring-hairline/70 transition-colors hover:bg-surface-2 disabled:opacity-60 cursor-pointer"
                  >
                    <FileDown className="h-4 w-4 text-[var(--color-brand)]" />
                    <span>{isGeneratingPdf ? 'Generating…' : 'Download PDF'}</span>
                  </button>

                  <button
                    onClick={handleThermalPrint}
                    className="flex items-center justify-center gap-1.5 rounded-[var(--radius-control)] bg-surface py-2.5 text-micro font-semibold text-ink ring-1 ring-hairline/70 transition-colors hover:bg-surface-2 cursor-pointer"
                  >
                    <Printer className="h-4 w-4 text-ink-muted" />
                    <span>Print bill</span>
                  </button>
                </div>

                {pdfError && (
                  <p
                    role="alert"
                    className="flex items-start gap-2 rounded-[var(--radius-control)] bg-[var(--color-danger)]/10 px-3 py-2 text-micro text-[var(--color-danger)] ring-1 ring-[var(--color-danger)]/25"
                  >
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    <span>{pdfError}</span>
                  </p>
                )}

                <button
                  onClick={handleReset}
                  className="w-full py-2.5 text-micro font-bold text-[var(--color-brand)] hover:underline cursor-pointer"
                >
                  + New bill
                </button>
              </div>
            </div>
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
                tier={pricingTier}
                onTierChange={setPricingTier}
              />

              <ItemChips
                items={inventoryItems}
                tier={pricingTier}
                onAdd={addItemToCart}
                onScan={() => setIsScannerOpen(true)}
              />

              {/* The bill's lines — each row is a CartLine; the sheet owns the list */}
              <div className="overflow-hidden rounded-[var(--radius-card)] bg-surface ring-1 ring-hairline/70">
                <div className="flex justify-between border-b border-hairline/70 bg-surface-2 px-3 py-2 text-micro font-bold uppercase text-ink-muted">
                  <span>Item</span>
                  <span>Qty & amount</span>
                </div>

                {cart.length === 0 ? (
                  <p className="p-6 text-center text-micro text-ink-subtle">
                    Your cart is empty — scan a barcode or tap an item above.
                  </p>
                ) : (
                  <div className="divide-y divide-hairline/70">
                    {cart.map((item) => (
                      <CartLine
                        key={item.id}
                        item={item}
                        onQty={updateQty}
                        onRemove={removeCartItem}
                      />
                    ))}
                  </div>
                )}
              </div>

              <MoneyBlock bill={bill} total={payableTotal} qrUrl={upiQrUrl} />

              {outOfStock.length > 0 && (
                <p
                  role="status"
                  className="flex items-start gap-2 rounded-[var(--radius-control)] bg-[var(--color-warn)]/10 px-3 py-2 text-micro text-[var(--color-warn)] ring-1 ring-[var(--color-warn)]/25"
                >
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span>
                    {outOfStock.map((line) => line.name).join(', ')}{' '}
                    {outOfStock.length === 1 ? 'is' : 'are'} out of stock — restock it in
                    Items, or bill it anyway if the count is stale.
                  </span>
                </p>
              )}

              {/* Checkout Action Button */}
              <button
                disabled={cart.length === 0}
                onClick={handleCheckout}
                className="flex w-full items-center justify-center gap-2 rounded-[var(--radius-card)] bg-[var(--color-in)] py-3.5 text-body font-bold text-white shadow-e2 transition-all hover:opacity-95 active:scale-[0.99] disabled:opacity-45 cursor-pointer"
              >
                <Receipt className="h-4 w-4" />
                <span>Save bill &amp; make invoice</span>
                {payableTotal > 0 && <Money value={payableTotal} className="text-white" />}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Barcode Scanner Modal */}
      <BarcodeScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScanSuccess={handleBarcodeScanned}
      />
    </>
  );
}
