import React, { useState } from 'react';
import { X, Receipt, IndianRupee, User, Loader2 } from 'lucide-react';
import { useDashboard } from '../../context/DashboardContext';
import { BUTTON, DIALOG, FIELD, HINT, LABEL } from '../ui/controls';

export default function NewSaleModal() {
  const { isAddSaleOpen, setIsAddSaleOpen, addSale, isFirebaseConfigured } = useDashboard();

  const [partyName, setPartyName] = useState('');
  const [amount, setAmount] = useState('');
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isAddSaleOpen) return null;

  const close = () => setIsAddSaleOpen(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    // `amount` is a string from the input: validate with Number()
    const amountNum = Number(amount);
    if (!amount || Number.isNaN(amountNum) || amountNum <= 0) {
      setError('Enter the amount the customer paid — for example 450.');
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      await addSale({
        party_name: partyName.trim() || 'Cash Customer',
        amount: amountNum,
        type: 'sale'
      });

      setPartyName('');
      setAmount('');
      setIsAddSaleOpen(false);
    } catch (err) {
      console.error(err);
      setError(`Could not save this sale: ${err.message}`);
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
            <div className="grid h-8 w-8 place-items-center rounded-[var(--radius-control)] bg-[var(--color-in)]/20 text-[var(--color-in-bright)]">
              <Receipt className="h-4 w-4" />
            </div>
            <div className="text-left">
              <h3 className={DIALOG.title}>Add sale</h3>
              <p className="text-micro text-white/70">
                {isFirebaseConfigured
                  ? 'Saved to your books — uploads automatically when offline'
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
          {/* Party / Customer Name */}
          <div>
            <label className={LABEL} htmlFor="sale-party">Customer name</label>
            <div className="relative">
              <User className="absolute left-3 top-2.5 h-4 w-4 text-ink-subtle" />
              <input
                id="sale-party"
                type="text"
                placeholder="e.g. Ramesh Traders, or leave blank"
                value={partyName}
                onChange={(e) => setPartyName(e.target.value)}
                className={`${FIELD} pl-9`}
              />
            </div>
          </div>

          {/* Amount Field */}
          <div>
            <label className={LABEL} htmlFor="sale-amount">Sale amount (₹) <span className="text-[var(--color-danger)]">*</span></label>
            <div className="relative">
              <IndianRupee className="absolute left-3 top-3 h-4 w-4 text-ink-subtle" />
              <input
                id="sale-amount"
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
          <p className={`rounded-[var(--radius-control)] bg-[var(--color-in)]/8 px-3 py-2 text-micro text-ink-muted ring-1 ring-[var(--color-in)]/20`}>
            Adds this sale to your books and to what the customer owes you.
          </p>
          <p className={HINT}>A blank name bills as Cash Customer.</p>

          {/* Actions */}
          <div className={DIALOG.footer}>
            <button type="button" disabled={isSubmitting} onClick={close} className={`${BUTTON.secondary} flex-1`}>
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting} className={`${BUTTON.success} flex-1`}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Saving…</span>
                </>
              ) : (
                <span>Save sale</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
