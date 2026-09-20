import React, { useState } from 'react';
import { X, Fuel, IndianRupee, FileText, Loader2, Wrench, Sparkles, Package, Store } from 'lucide-react';
import { useDashboard } from '../../context/DashboardContext';
import { BUTTON, DIALOG, FIELD, HINT, LABEL } from '../ui/controls';

// Quick-pick expense categories (the label is stored as party_name and
// duplicated into items_json so Reports can group by it later)
const EXPENSE_CATEGORIES = [
  { key: 'petrol', label: 'Petrol / Fuel', icon: Fuel },
  { key: 'maintenance', label: 'Maintenance', icon: Wrench },
  { key: 'utilities', label: 'Utilities', icon: Sparkles },
  { key: 'rent', label: 'Rent', icon: Store },
  { key: 'other', label: 'Other', icon: Package }
];

export default function NewExpenseModal() {
  const { isAddExpenseOpen, setIsAddExpenseOpen, addExpense } = useDashboard();

  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('petrol');
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isAddExpenseOpen) return null;

  const close = () => setIsAddExpenseOpen(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const amountNum = Number(amount);
    if (!amount || Number.isNaN(amountNum) || amountNum <= 0) {
      setError('Enter how much you spent — for example 500.');
      return;
    }
    const desc = description.trim() || 'General Expense';

    setError(null);
    setIsSubmitting(true);
    try {
      await addExpense({
        description: desc,
        amount: amountNum,
        category
      });
      setDescription('');
      setAmount('');
      setCategory('petrol');
      setIsAddExpenseOpen(false);
    } catch (err) {
      console.error(err);
      setError(`Could not save this expense: ${err.message}`);
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
            <div className="grid h-8 w-8 place-items-center rounded-[var(--radius-control)] bg-[var(--color-warn)]/20 text-[var(--color-warn-bright)]">
              <Fuel className="h-4 w-4" />
            </div>
            <div className="text-left">
              <h3 className={DIALOG.title}>Add expense</h3>
              <p className="text-micro text-white/70">Fuel, rent, repairs — money going out</p>
            </div>
          </div>
          <button onClick={close} className={DIALOG.close} aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className={`${DIALOG.body} overflow-y-auto text-left`}>
          {/* Category quick-picks */}
          <div>
            <span className={LABEL}>Category</span>
            <div className="grid grid-cols-3 gap-2">
              {EXPENSE_CATEGORIES.map(cat => {
                const CatIcon = cat.icon;
                const isActive = category === cat.key;
                return (
                  <button
                    key={cat.key}
                    type="button"
                    onClick={() => setCategory(cat.key)}
                    aria-pressed={isActive}
                    className={`flex flex-col items-center gap-1 rounded-[var(--radius-control)] px-2 py-2.5 text-micro font-semibold ring-1 transition-all cursor-pointer ${
                      isActive
                        ? 'bg-[var(--color-warn)]/12 text-[var(--color-warn)] ring-[var(--color-warn)]/40'
                        : 'bg-surface-2 text-ink-muted ring-hairline/70 hover:text-ink'
                    }`}
                  >
                    <CatIcon className="h-4 w-4" />
                    <span>{cat.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className={LABEL} htmlFor="expense-description">Description</label>
            <div className="relative">
              <FileText className="absolute left-3 top-2.5 h-4 w-4 text-ink-subtle" />
              <input
                id="expense-description"
                type="text"
                placeholder={category === 'petrol' ? 'e.g. Bike fuel for delivery run' : 'e.g. Monthly shop rent'}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className={`${FIELD} pl-9`}
              />
            </div>
          </div>

          {/* Amount */}
          <div>
            <label className={LABEL} htmlFor="expense-amount">Amount (₹) <span className="text-[var(--color-danger)]">*</span></label>
            <div className="relative">
              <IndianRupee className="absolute left-3 top-3 h-4 w-4 text-ink-subtle" />
              <input
                id="expense-amount"
                type="number"
                step="any"
                min="0"
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
          <p className="rounded-[var(--radius-control)] bg-[var(--color-warn)]/8 px-3 py-2 text-micro text-ink-muted ring-1 ring-[var(--color-warn)]/20">
            Expenses come off your profit. They are not something you owe a supplier, so they stay out of payables.
          </p>
          <p className={HINT}>A blank description is saved as General Expense.</p>

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
                <span>Save expense</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
