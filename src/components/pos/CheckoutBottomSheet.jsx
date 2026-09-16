import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  X,
  Camera,
  Plus,
  Minus,
  Trash2,
  Receipt,
  Printer,
  Share2,
  FileDown,
  CheckCircle2,
  Sparkles,
  QrCode,
  User,
  Tags,
  IndianRupee,
  ShoppingBag,
  ExternalLink,
  ChevronDown,
  Users
} from 'lucide-react';
import { useDashboard } from '../../context/DashboardContext';
import { useVendors } from '../../hooks/useVendors';
import { generateUpiQrCodeDataUrl, generateInvoicePdf, shareInvoiceOnWhatsApp } from '../../utils/posUtilities';
import BarcodeScannerModal from './BarcodeScannerModal';

// Demo inventory used until the merchant adds real items (stable identity,
// defined at module scope so it doesn't break memoization below).
const FALLBACK_INVENTORY = [
  { id: '1', item_name: 'Basmati Rice Premium 5kg', retail_price: 550, wholesale_price: 470, barcode: '8901234567890', stock: 45 },
  { id: '2', item_name: 'Cold Pressed Coconut Oil 1L', retail_price: 320, wholesale_price: 260, barcode: '8909876543210', stock: 80 },
  { id: '3', item_name: 'Organic Atta Flour 10kg', retail_price: 460, wholesale_price: 395, barcode: '8904567890123', stock: 60 }
];

export default function CheckoutBottomSheet({ isOpen, onClose }) {
  const { currentData, addSale, isSupabaseConfigured, businessInfo = {} } = useDashboard();
  // Saved customers from the Supabase vendor registry (offline-safe: empty list
  // when unreachable — local parties below still work)
  const { vendors } = useVendors();

  // Customer & Pricing Tier state
  const [customerName, setCustomerName] = useState('Cash Customer');
  const [customerPhone, setCustomerPhone] = useState('');
  const [pricingTier, setPricingTier] = useState('retail'); // 'retail' or 'wholesale'

  // Saved-customer picker state
  const [isCustomerListOpen, setIsCustomerListOpen] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const customerListRef = useRef(null);

  // Merge local parties + registry customers (deduped by name+phone)
  const savedCustomers = useMemo(() => {
    const partyCustomers = (currentData.parties || []).map(p => ({
      key: `party-${p.id}`,
      name: p.name,
      phone: p.phone && p.phone !== '--' ? String(p.phone) : '',
      source: 'Party'
    }));
    const registryCustomers = (vendors || [])
      .filter(v => v.type === 'customer')
      .map(v => ({
        key: `vendor-${v.id}`,
        name: v.name,
        phone: v.phone ? String(v.phone) : '',
        source: 'Registry'
      }));
    const seen = new Set();
    return [...partyCustomers, ...registryCustomers].filter(c => {
      if (!c.name) return false;
      const k = `${c.name.toLowerCase()}|${c.phone}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  }, [currentData.parties, vendors]);

  const filteredCustomers = useMemo(() => {
    const q = customerSearch.toLowerCase();
    if (!q) return savedCustomers;
    return savedCustomers.filter(c =>
      c.name.toLowerCase().includes(q) || String(c.phone).includes(q)
    );
  }, [savedCustomers, customerSearch]);

  // Close the customer dropdown on outside click / Escape
  useEffect(() => {
    if (!isCustomerListOpen) return;
    const handlePointer = (e) => {
      if (customerListRef.current && !customerListRef.current.contains(e.target)) {
        setIsCustomerListOpen(false);
      }
    };
    const handleKey = (e) => { if (e.key === 'Escape') setIsCustomerListOpen(false); };
    document.addEventListener('mousedown', handlePointer);
    document.addEventListener('touchstart', handlePointer);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handlePointer);
      document.removeEventListener('touchstart', handlePointer);
      document.removeEventListener('keydown', handleKey);
    };
  }, [isCustomerListOpen]);

  const selectSavedCustomer = (c) => {
    setCustomerName(c.name);
    // Normalize to the 10-digit local format the WhatsApp field expects
    const digits = String(c.phone || '').replace(/\D/g, '');
    setCustomerPhone(digits.length >= 10 ? digits.slice(-10) : digits);
    setSelectedCustomer(c);
    setIsCustomerListOpen(false);
    setCustomerSearch('');
  };

  const clearSelectedCustomer = () => {
    setSelectedCustomer(null);
    setCustomerName('');
    setCustomerPhone('');
  };

  // Cart line items (raw; display rates are derived from pricingTier below)
  const [rawCart, setCart] = useState([]);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [upiQrUrl, setUpiQrUrl] = useState(null);
  const [isCompleted, setIsCompleted] = useState(false);
  const [completedInvoice, setCompletedInvoice] = useState(null);
  const [receiptQrUrl, setReceiptQrUrl] = useState(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
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

  // Cart total calculations
  const cartTotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + Number(item.total || 0), 0);
  }, [cart]);

  // Dynamic merchant UPI ID & Business Info from Context
  const merchantUpiId = businessInfo.upiId || 'jaggusts@okhdfcbank';
  const merchantName = businessInfo.name || 'SwiftBill Store';

  // Update dynamic UPI QR code whenever total changes (guard against
  // out-of-order async resolution after rapid total changes)
  useEffect(() => {
    let cancelled = false;
    if (cartTotal > 0) {
      generateUpiQrCodeDataUrl(merchantUpiId, merchantName, cartTotal, 'INV-PREVIEW')
        .then(url => { if (!cancelled) setUpiQrUrl(url); });
    } else {
      setUpiQrUrl(null);
    }
    return () => { cancelled = true; };
  }, [cartTotal, merchantUpiId, merchantName]);

  // Add item to cart: store the item's own prices; the derived `cart`
  // recomputes rate/total from the current tier, so no manual math here.
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

  // Complete checkout & record sale in Supabase / offline DB
  const handleCheckout = async () => {
    if (cart.length === 0) {
      alert("Please add at least one item to checkout");
      return;
    }

    const invoice = {
      id: `INV-${Math.floor(100000 + Math.random() * 900000)}`,
      date: new Date().toLocaleDateString('en-IN'),
      amount: cartTotal,
      party_name: customerName.trim() || 'Cash Customer',
      customer_phone: customerPhone.trim(),
      pricing_tier: pricingTier,
      items_json: cart
    };

    // Save to context and Supabase
    await addSale(invoice);
    // Snapshot the exact-amount QR for the receipt BEFORE resetting the
    // cart state (which clears the live preview QR)
    const receiptQr = cartTotal > 0
      ? await generateUpiQrCodeDataUrl(merchantUpiId, merchantName, cartTotal, invoice.id)
      : null;
    setReceiptQrUrl(receiptQr);
    setCompletedInvoice(invoice);
    setIsCompleted(true);
    // Reset entry state so the next bill starts clean (keeps the receipt
    // visible until the user taps "New Bill" or closes)
    setCart([]);
    setCustomerName('');
    setCustomerPhone('');
    setSelectedCustomer(null);
    setPricingTier('retail');
  };

  // Download PDF
  const handleDownloadPdf = async () => {
    if (!completedInvoice) return;
    setIsGeneratingPdf(true);
    try {
      const doc = await generateInvoicePdf(completedInvoice, businessInfo);
      doc.save(`${completedInvoice.id}.pdf`);
    } catch (e) {
      console.error(e);
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
        className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-xs transition-opacity"
      />

      <div className="print-area fixed inset-x-0 bottom-0 z-50 bg-white rounded-t-3xl shadow-2xl flex flex-col max-h-[92vh] sm:max-w-xl sm:mx-auto transition-transform duration-300 animate-slideUp overflow-hidden">
        {/* Drag handle */}
        <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto mt-2.5 mb-1 cursor-grab"></div>

        {/* Sheet Header */}
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-xs">
              <ShoppingBag className="w-4 h-4" />
            </div>
            <div className="text-left">
              <h2 className="font-bold text-base text-slate-900 leading-tight">
                {isCompleted ? 'Invoice Generated' : 'Mobile POS Checkout'}
              </h2>
              <span className="text-[11px] text-slate-500">
                {isCompleted ? completedInvoice?.id : 'Dual Pricing • Camera Barcode • UPI'}
              </span>
            </div>
          </div>
          <button
            onClick={isCompleted ? handleReset : onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sheet Content Body */}
        <div className="p-4 overflow-y-auto flex-1 text-left space-y-4">
          {isCompleted ? (
            /* SUCCESS CONFIRMATION & RECEIPT ACTIONS */
            <div className="text-center py-4 space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
                <CheckCircle2 className="w-9 h-9 stroke-[2.5]" />
              </div>

              <div>
                <h3 className="text-lg font-black text-slate-900">
                  ₹{Number(completedInvoice.amount).toLocaleString('en-IN')} Paid
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Billed to <strong>{completedInvoice.party_name}</strong> ({completedInvoice.pricing_tier} tier)
                </p>
              </div>

              {/* Dynamic UPI QR Code Display on Screen */}
              {receiptQrUrl && (
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 inline-block mx-auto text-center shadow-xs">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-indigo-900 mb-2 flex items-center justify-center gap-1.5">
                    <QrCode className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Dynamic UPI Payment QR</span>
                  </div>
                  <img
                    src={receiptQrUrl}
                    alt="UPI Payment QR Code"
                    className="w-44 h-44 mx-auto rounded-xl shadow-xs border border-slate-200"
                  />
                  <div className="mt-2.5 text-xs font-black text-emerald-600">
                    Exact Amount: ₹{completedInvoice.amount.toFixed(2)}
                  </div>
                  <div className="mt-1 px-2.5 py-1 rounded-lg bg-indigo-50 border border-indigo-100/80 text-[11px] font-mono text-indigo-900 select-all font-semibold">
                    UPI: {merchantUpiId}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1">
                    Scan with any UPI App (GPay / PhonePe / Paytm)
                  </div>
                </div>
              )}

              {/* Delivery Action Buttons: WhatsApp & PDF & Thermal Print */}
              <div className="space-y-2.5 pt-2">
                <button
                  onClick={handleWhatsAppShare}
                  className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md flex items-center justify-center gap-2 cursor-pointer transition-transform active:scale-95"
                >
                  <Share2 className="w-4 h-4" />
                  <span>Send Bill on WhatsApp</span>
                </button>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={handleDownloadPdf}
                    disabled={isGeneratingPdf}
                    className="py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <FileDown className="w-4 h-4 text-indigo-600" />
                    <span>{isGeneratingPdf ? 'Generating...' : 'Download PDF'}</span>
                  </button>

                  <button
                    onClick={handleThermalPrint}
                    className="py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Printer className="w-4 h-4 text-slate-600" />
                    <span>Thermal Print</span>
                  </button>
                </div>

                <button
                  onClick={handleReset}
                  className="w-full py-2.5 text-xs text-indigo-600 font-bold hover:underline cursor-pointer"
                >
                  + New Bill
                </button>
              </div>
            </div>
          ) : (
            /* ACTIVE CART & CHECKOUT FORM */
            <>
              {/* Customer Profile & Dual Pricing Tier Selector */}
              <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Customer Profile</span>
                  </span>

                  {/* Dual Pricing Toggle Button */}
                  <div className="flex items-center bg-white p-0.5 rounded-xl border border-slate-200 shadow-2xs">
                    <button
                      type="button"
                      onClick={() => setPricingTier('retail')}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        pricingTier === 'retail'
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Retail
                    </button>
                    <button
                      type="button"
                      onClick={() => setPricingTier('wholesale')}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        pricingTier === 'wholesale'
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Wholesale
                    </button>
                  </div>
                </div>

                {/* Saved-customer picker: one tap instead of typing */}
                <div className="relative" ref={customerListRef}>
                  <button
                    type="button"
                    onClick={() => setIsCustomerListOpen(o => !o)}
                    aria-haspopup="listbox"
                    aria-expanded={isCustomerListOpen}
                    className="w-full flex items-center justify-between gap-2 px-3 py-1.5 bg-white rounded-xl border border-slate-200 text-xs font-medium hover:border-indigo-300 transition-colors cursor-pointer"
                  >
                    <span className="flex items-center gap-1.5 min-w-0">
                      <Users className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                      {selectedCustomer ? (
                        <span className="truncate">
                          <span className="font-bold text-slate-800">{selectedCustomer.name}</span>
                          {selectedCustomer.phone && <span className="text-slate-400"> · {selectedCustomer.phone}</span>}
                        </span>
                      ) : (
                        <span className="text-slate-500">Select saved customer (Parties / Registry)</span>
                      )}
                    </span>
                    {selectedCustomer ? (
                      <span
                        role="button"
                        tabIndex={0}
                        onClick={(e) => { e.stopPropagation(); clearSelectedCustomer(); }}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); clearSelectedCustomer(); } }}
                        className="p-0.5 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 shrink-0 cursor-pointer"
                        aria-label="Clear selected customer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </span>
                    ) : (
                      <ChevronDown className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform ${isCustomerListOpen ? 'rotate-180' : ''}`} />
                    )}
                  </button>

                  {isCustomerListOpen && (
                    <div className="absolute left-0 right-0 mt-1 bg-white rounded-xl shadow-lg border border-slate-100 py-1 z-30">
                      <div className="px-2 pb-1">
                        <input
                          type="text"
                          autoFocus
                          placeholder="Search customers..."
                          value={customerSearch}
                          onChange={(e) => setCustomerSearch(e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>
                      <div className="max-h-44 overflow-y-auto">
                        {filteredCustomers.length === 0 ? (
                          <p className="px-3 py-3 text-[11px] text-slate-400 text-center">
                            No saved customers found — add one in Parties or the Vendor Registry.
                          </p>
                        ) : (
                          filteredCustomers.map(c => (
                            <button
                              key={c.key}
                              type="button"
                              onClick={() => selectSavedCustomer(c)}
                              className={`w-full flex items-center justify-between gap-2 px-3 py-2 text-left hover:bg-indigo-50 transition-colors cursor-pointer ${
                                selectedCustomer?.key === c.key ? 'bg-indigo-50/60' : ''
                              }`}
                            >
                              <span className="flex items-center gap-2 min-w-0">
                                <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                <span className="min-w-0">
                                  <span className="block text-xs font-semibold text-slate-800 truncate">{c.name}</span>
                                  {c.phone && <span className="block text-[10px] text-slate-400">{c.phone}</span>}
                                </span>
                              </span>
                              <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 shrink-0">
                                {c.source}
                              </span>
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Manual entry (pre-filled when a saved customer is picked) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Customer Name (e.g. Rahul Traders)"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="px-3 py-1.5 bg-white rounded-xl border border-slate-200 text-xs font-medium focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                  />
                  <input
                    type="tel"
                    placeholder="WhatsApp Phone (10 digits)"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="px-3 py-1.5 bg-white rounded-xl border border-slate-200 text-xs font-medium focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Quick Item Addition & Barcode Trigger */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Add Items to Bill
                  </span>
                  <button
                    onClick={() => setIsScannerOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs active:scale-95 transition-all cursor-pointer"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>Scan Barcode</span>
                  </button>
                </div>

                {/* Horizontal Quick Item Chips */}
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {inventoryItems.map(item => {
                    const price = pricingTier === 'wholesale'
                      ? (item.wholesale_price || item.retail_price * 0.85)
                      : (item.retail_price || item.price);

                    return (
                      <button
                        key={item.id}
                        onClick={() => addItemToCart(item)}
                        className="px-3 py-2 bg-white border border-slate-200 hover:border-indigo-300 rounded-xl text-left shrink-0 shadow-2xs transition-all active:scale-95 cursor-pointer"
                      >
                        <div className="font-bold text-xs text-slate-800 truncate max-w-[130px]">
                          {item.item_name || item.name}
                        </div>
                        <div className="text-[11px] font-extrabold text-emerald-600 mt-0.5">
                          ₹{price.toFixed(0)}{' '}
                          <span className="text-[10px] text-slate-400 font-normal">
                            ({pricingTier})
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Cart Line Items Table */}
              <div className="border border-slate-200/90 rounded-2xl overflow-hidden bg-white shadow-2xs">
                <div className="bg-slate-50 px-3 py-2 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase flex justify-between">
                  <span>Item Description</span>
                  <span>Qty & Subtotal</span>
                </div>

                {cart.length === 0 ? (
                  <div className="p-6 text-center text-slate-400 text-xs">
                    Your cart is empty. Scan an item barcode or tap items above.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {cart.map(item => (
                      <div key={item.id} className="p-3 flex items-center justify-between">
                        <div className="min-w-0 pr-2">
                          <div className="text-xs font-bold text-slate-900 truncate">
                            {item.name}
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            ₹{item.rate} each
                          </div>
                        </div>
                        <button
                          onClick={() => removeCartItem(item.id)}
                          className="text-slate-300 hover:text-rose-600 transition-colors cursor-pointer mr-1"
                          aria-label={`Remove ${item.name} from cart`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>

                        {/* Quantity Stepper */}
                        <div className="flex items-center gap-3 shrink-0">
                          <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden bg-slate-50">
                            <button
                              onClick={() => updateQty(item.id, -1)}
                              className="px-2 py-1 hover:bg-slate-200 text-slate-600 transition-colors"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="px-2.5 text-xs font-bold text-slate-800">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() => updateQty(item.id, 1)}
                              className="px-2 py-1 hover:bg-slate-200 text-slate-600 transition-colors"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>

                          <div className="text-right min-w-[60px]">
                            <span className="text-xs font-extrabold text-slate-900">
                              ₹{item.total.toFixed(0)}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Dynamic Bill Summary & UPI QR Preview */}
              {cartTotal > 0 && (
                <div className="p-3 rounded-2xl bg-indigo-50/60 border border-indigo-100 flex items-center justify-between">
                  <div>
                    <div className="text-[11px] text-indigo-700 font-semibold uppercase">
                      Total Cart Value
                    </div>
                    <div className="text-xl font-black text-indigo-950">
                      ₹{cartTotal.toLocaleString('en-IN')}
                    </div>
                  </div>

                  {upiQrUrl && (
                    <div className="flex items-center gap-2">
                      <img
                        src={upiQrUrl}
                        alt="UPI Preview"
                        className="w-12 h-12 rounded-lg border border-indigo-200 bg-white p-0.5"
                      />
                      <div className="text-[10px] text-slate-500 text-left">
                        <span className="font-bold text-indigo-700 block">UPI Ready</span>
                        <span>Auto ₹{cartTotal}</span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Checkout Action Button */}
              <button
                disabled={cart.length === 0}
                onClick={handleCheckout}
                className="w-full py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-sm sm:text-base shadow-lg shadow-emerald-600/20 active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <Receipt className="w-4 h-4" />
                <span>Save Bill & Generate Invoice (₹{cartTotal})</span>
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
