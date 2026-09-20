import React, { useState } from 'react';
import { X, ShoppingCart, IndianRupee, Building, Loader2, Package } from 'lucide-react';
import { useDashboard } from '../../context/DashboardContext';
import { useProducts } from '../../hooks/useProducts';
import SearchableProductSelect from '../ui/SearchableProductSelect';
import { incrementStock } from '../../lib/firestoreApi';
import { BUTTON, DIALOG, FIELD, HINT, LABEL } from '../ui/controls';

export default function NewPurchaseModal() {
  const { isAddPurchaseOpen, setIsAddPurchaseOpen, addPurchase, isFirebaseConfigured } = useDashboard();
  const { products, isLoading: isLoadingProducts, error: productsError } = useProducts();

  const [supplierName, setSupplierName] = useState('');
  const [product, setProduct] = useState(null);
  const [qty, setQty] = useState('');
  const [amount, setAmount] = useState('');
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isAddPurchaseOpen) return null;

  const close = () => setIsAddPurchaseOpen(false);

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
          {/* Supplier Name */}
          <div>
            <label className={LABEL} htmlFor="purchase-supplier">Supplier name</label>
            <div className="relative">
              <Building className="absolute left-3 top-2.5 h-4 w-4 text-ink-subtle" />
              <input
                id="purchase-supplier"
                type="text"
                placeholder="e.g. Krishna Wholesalers"
                value={supplierName}
                onChange={(e) => setSupplierName(e.target.value)}
                className={`${FIELD} pl-9`}
              />
            </div>
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
