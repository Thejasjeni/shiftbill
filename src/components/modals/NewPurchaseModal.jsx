import React, { useEffect, useMemo, useRef, useState } from 'react';
import { X, ShoppingCart, IndianRupee, Building, Loader2, Package } from 'lucide-react';
import { useDashboard } from '../../context/DashboardContext';
import { useProducts } from '../../hooks/useProducts';
import { useVendors } from '../../hooks/useVendors';
import SearchableProductSelect from '../ui/SearchableProductSelect';
import { incrementStock } from '../../lib/firestoreApi';
import { BUTTON, DIALOG, FIELD, HINT, LABEL } from '../ui/controls';

export default function NewPurchaseModal() {
  const { isAddPurchaseOpen, setIsAddPurchaseOpen, addPurchase, isFirebaseConfigured } = useDashboard();
  const { products, isLoading: isLoadingProducts, error: productsError } = useProducts();
  const { vendors } = useVendors();

  const [supplierName, setSupplierName] = useState('');
  const [product, setProduct] = useState(null);
  const [qty, setQty] = useState('');
  const [amount, setAmount] = useState('');
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSupplierListOpen, setIsSupplierListOpen] = useState(false);
  const [supplierHighlight, setSupplierHighlight] = useState(0);
  const supplierRef = useRef(null);
  const supplierListRef = useRef(null);

  // Saved suppliers = the registry rows marked as suppliers.
  const suppliers = useMemo(
    () => vendors.filter((v) => v.type === 'supplier'),
    [vendors]
  );
  const filteredSuppliers = useMemo(() => {
    const q = supplierName.trim().toLowerCase();
    if (!q) return suppliers;
    return suppliers.filter(
      (s) =>
        String(s.name || '').toLowerCase().includes(q) ||
        String(s.phone || '').includes(q)
    );
  }, [suppliers, supplierName]);

  // Clamped during render, so a shrinking list can never point outside it
  const activeSupplier = Math.min(supplierHighlight, Math.max(0, filteredSuppliers.length - 1));

  // Close the suggestion list when a tap lands outside the field
  useEffect(() => {
    if (!isSupplierListOpen) return;
    const onDocDown = (e) => {
      if (supplierRef.current && !supplierRef.current.contains(e.target)) setIsSupplierListOpen(false);
    };
    document.addEventListener('mousedown', onDocDown);
    return () => document.removeEventListener('mousedown', onDocDown);
  }, [isSupplierListOpen]);

  // Scroll the highlighted supplier into view
  useEffect(() => {
    if (!isSupplierListOpen || !supplierListRef.current) return;
    supplierListRef.current.children[activeSupplier]?.scrollIntoView({ block: 'nearest' });
  }, [activeSupplier, isSupplierListOpen]);

  if (!isAddPurchaseOpen) return null;

  const close = () => {
    setIsSupplierListOpen(false);
    setIsAddPurchaseOpen(false);
  };

  const pickSupplier = (s) => {
    setSupplierName(s.name || '');
    setIsSupplierListOpen(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    // `amount` is a string from the input: validate with Number()
    const amountNum = Number(amount);
    if (!amount || Number.isNaN(amountNum) || amountNum <= 0) {
      setError('Enter the bill amount you were charged.');
      return;
    }

    // Product selection is optional, but a picked product needs a quantity
    // so its stock can be incremented.
    const qtyNum = Number(qty);
    if (product && (!qty || Number.isNaN(qtyNum) || qtyNum <= 0)) {
      setError(`Enter how many ${product.unit || 'units'} of ${product.name} arrived, so the stock can go up.`);
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      await addPurchase({
        party_name: supplierName.trim() || 'General Supplier',
        amount: amountNum,
        type: 'purchase'
      });

      // Stock-in: `increment` is applied server-side, so concurrent edits
      // can't overwrite each other, and it queues offline like any other write
      if (product && isFirebaseConfigured) {
        try {
          await incrementStock(product.id, qtyNum);
        } catch (err) {
          console.warn('Stock update failed, will sync when reachable:', err.message);
        }
      }

      setSupplierName('');
      setIsSupplierListOpen(false);
      setProduct(null);
      setQty('');
      setAmount('');
      setIsAddPurchaseOpen(false);
    } catch (err) {
      console.error(err);
      setError(`Could not save this purchase: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={DIALOG.overlaySheet}>
      <div className={`${DIALOG.cardSheet} flex max-h-[90vh] flex-col sm:max-w-md`}>
        {/* Header */}
        <div className={DIALOG.headerSheet}>
          <div className="flex items-center gap-2.5">
            <div className="grid h-8 w-8 place-items-center rounded-[var(--radius-control)] bg-[var(--color-out)]/20 text-violet-300">
              <ShoppingCart className="h-4 w-4" />
            </div>
            <div className="text-left">
              <h3 className={DIALOG.title}>Add purchase</h3>
              <p className="text-micro text-white/70">
                {isFirebaseConfigured
                  ? 'Pick a product to add its stock at the same time'
                  : 'Stored on this device only'}
              </p>
            </div>
          </div>
          <button onClick={close} className={DIALOG.close} aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className={`${DIALOG.body} overflow-y-auto text-left`}>
          {/* Supplier — one tap from the saved list, or type a one-off name */}
          <div ref={supplierRef}>
            <label className={LABEL} htmlFor="purchase-supplier">Supplier name</label>
            <div className="relative">
              <Building className="absolute left-3 top-2.5 h-4 w-4 text-ink-subtle" />
              <input
                id="purchase-supplier"
                type="text"
                placeholder={suppliers.length ? 'Pick a saved supplier or type a name' : 'e.g. Krishna Wholesalers'}
                value={supplierName}
                autoComplete="off"
                onChange={(e) => { setSupplierName(e.target.value); setIsSupplierListOpen(true); setSupplierHighlight(0); }}
                onFocus={() => setIsSupplierListOpen(true)}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    setSupplierHighlight(Math.min(activeSupplier + 1, filteredSuppliers.length - 1));
                  } else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    setSupplierHighlight(Math.max(activeSupplier - 1, 0));
                  } else if (e.key === 'Enter' && isSupplierListOpen && filteredSuppliers[activeSupplier]) {
                    e.preventDefault();
                    pickSupplier(filteredSuppliers[activeSupplier]);
                  } else if (e.key === 'Escape') {
                    setIsSupplierListOpen(false);
                  }
                }}
                className={`${FIELD} pl-9`}
              />

              {isSupplierListOpen && suppliers.length > 0 && (
                <div className="absolute z-20 mt-1 max-h-44 w-full overflow-y-auto rounded-[var(--radius-card)] bg-surface py-1 text-left shadow-e3 ring-1 ring-hairline/70">
                  {filteredSuppliers.length === 0 ? (
                    <p className="px-3 py-3 text-micro text-ink-subtle">
                      No saved supplier matches “{supplierName.trim()}” — keep typing to record it as new.
                    </p>
                  ) : (
                    <ul ref={supplierListRef}>
                      {filteredSuppliers.map((s, i) => (
                        <li key={s.id}>
                          <button
                            type="button"
                            onMouseEnter={() => setSupplierHighlight(i)}
                            onClick={() => pickSupplier(s)}
                            className={`flex w-full items-center gap-2 px-3 py-2 text-left transition-colors cursor-pointer ${
                              i === activeSupplier ? 'bg-surface-2' : 'hover:bg-surface-2/60'
                            }`}
                          >
                            <div className="min-w-0">
                              <p className="truncate text-body font-bold text-ink">{s.name}</p>
                              {s.phone && <p className="num text-micro text-ink-subtle">{s.phone}</p>}
                            </div>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
            {suppliers.length === 0 && (
              <p className={HINT}>Save suppliers under Parties to pick them here.</p>
            )}
          </div>

          {/* Product picker (searchable dropdown from database) */}
          <SearchableProductSelect
            products={products}
            value={product}
            onChange={setProduct}
            isLoading={isLoadingProducts}
            error={productsError}
          />

          {/* Quantity — only relevant when a product is selected */}
          {product && (
            <div>
              <label className={LABEL} htmlFor="purchase-qty">Quantity received ({product.unit})</label>
              <div className="relative">
                <Package className="absolute left-3 top-2.5 h-4 w-4 text-ink-subtle" />
                <input
                  id="purchase-qty"
                  type="number"
                  step="any"
                  min="0"
                  placeholder="e.g. 10"
                  value={qty}
                  onChange={(e) => setQty(e.target.value)}
                  className={`${FIELD} num pl-9 font-semibold`}
                />
              </div>
              <p className={HINT}>Stock goes up by this much when you save.</p>
            </div>
          )}

          {/* Amount Field */}
          <div>
            <label className={LABEL} htmlFor="purchase-amount">Bill amount (₹) <span className="text-[var(--color-danger)]">*</span></label>
            <div className="relative">
              <IndianRupee className="absolute left-3 top-3 h-4 w-4 text-ink-subtle" />
              <input
                id="purchase-amount"
                type="number"
                step="any"
                required
                autoFocus
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className={`${FIELD} num pl-9 text-title font-bold`}
              />
            </div>
          </div>

          {error && (
            <p role="alert" className="rounded-[var(--radius-control)] bg-[var(--color-danger)]/10 px-3 py-2 text-micro text-[var(--color-danger)] ring-1 ring-[var(--color-danger)]/25">
              {error}
            </p>
          )}

          {/* What this will do, in the seller's words */}
          <p className="rounded-[var(--radius-control)] bg-[var(--color-out)]/8 px-3 py-2 text-micro text-ink-muted ring-1 ring-[var(--color-out)]/20">
            Adds this bill to what you owe the supplier. The money is ready to pay from your books.
          </p>

          {/* Actions */}
          <div className={DIALOG.footer}>
            <button type="button" disabled={isSubmitting} onClick={close} className={`${BUTTON.secondary} flex-1`}>
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting} className={`${BUTTON.primary} flex-1`}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Saving…</span>
                </>
              ) : (
                <span>Save purchase</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
