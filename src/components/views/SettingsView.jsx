import React, { useState } from 'react';
import { Building2, Percent } from 'lucide-react';
import { useDashboard } from '../../context/DashboardContext';
import Surface from '../ui/Surface';
import { FIELD, LABEL, HINT } from '../ui/controls';

// What the profile form says about the edit just made. Nothing is shown until
// there is one, so the form opens without a status it hasn't earned.
const SAVE_STATUS = {
  saving: { text: 'Saving…', tone: 'text-ink-subtle' },
  saved: { text: 'Saved to your account', tone: 'text-[var(--color-in)]' },
  device: { text: 'Saved on this device', tone: 'text-ink-subtle' },
  error: { text: 'Not saved', tone: 'text-[var(--color-danger)]' }
};

export default function SettingsView() {
  const { businessInfo, setBusinessInfo, profileSaveState, profileSaveError } = useDashboard();
  // Appearance is this device's, so it is state here and never part of the
  // profile the form saves.
  // One updater for every field, so a new setting is one line in the markup.
  const set = (key) => (e) => {
    const value = e.target.type === 'number' ? Number(e.target.value) || 0 : e.target.value;
    setBusinessInfo({ ...businessInfo, [key]: value });
  };

  const saveStatus = SAVE_STATUS[profileSaveState];

  return (
    <div className="max-w-3xl space-y-4 text-left">
      <Surface>
        <h1 className="text-title font-bold text-ink">Business &amp; app settings</h1>
        <p className="text-micro text-ink-muted">
          Business profile, GST details and what prints on your bills
        </p>
      </Surface>

      {/* Business Details Form */}
      <Surface className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
          <h2 className="flex items-center gap-2 text-body font-bold uppercase tracking-wider text-ink">
            <Building2 className="h-4 w-4 text-[var(--color-brand)]" />
            <span>Business profile</span>
          </h2>
          {saveStatus && (
            <p aria-live="polite" className={`text-micro font-bold ${saveStatus.tone}`}>
              {saveStatus.text}
              {profileSaveError && ` — ${profileSaveError}`}
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className={LABEL} htmlFor="biz-name">Company / store name</label>
            <input id="biz-name" type="text" value={businessInfo.name} onChange={set('name')} className={FIELD} />
          </div>

          <div>
            <label className={LABEL} htmlFor="biz-gstin">GSTIN</label>
            <input
              id="biz-gstin"
              type="text"
              value={businessInfo.gstin}
              onChange={set('gstin')}
              className={`${FIELD} num uppercase`}
            />
          </div>

          <div>
            <label className={LABEL} htmlFor="biz-phone">Phone number (WhatsApp)</label>
            <input
              id="biz-phone"
              type="text"
              value={businessInfo.phone || ''}
              onChange={set('phone')}
              className={`${FIELD} num`}
              placeholder="e.g. 9495385472"
            />
          </div>

          <div>
            <label className={LABEL} htmlFor="biz-upi">Merchant UPI ID (for the QR code)</label>
            <input
              id="biz-upi"
              type="text"
              value={businessInfo.upiId || ''}
              onChange={set('upiId')}
              className={`${FIELD} num`}
              placeholder="e.g. jaggusts@okhdfcbank"
            />
          </div>

          <div className="sm:col-span-2">
            <label className={LABEL} htmlFor="biz-city">Location / address</label>
            <input id="biz-city" type="text" value={businessInfo.city} onChange={set('city')} className={FIELD} />
          </div>
        </div>

        {/* Bill money block: both default to 0, so bills stay at the cart total */}
        <div className="border-t border-hairline/60 pt-4">
          <h3 className="flex items-center gap-2 text-body font-bold uppercase tracking-wider text-ink">
            <Percent className="h-4 w-4 text-[var(--color-brand)]" />
            <span>Bill totals</span>
          </h3>
          <p className={HINT}>
            These configure the totals printed on every bill. Leave both at 0 and every bill is simply its cart total.
          </p>
          <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={LABEL} htmlFor="biz-discount">Discount on every bill (%)</label>
              <input
                id="biz-discount"
                type="number"
                min="0"
                max="100"
                step="0.5"
                value={businessInfo.discountPercent ?? 0}
                onChange={set('discountPercent')}
                className={`${FIELD} num`}
              />
              <p className={HINT}>Taken off the sub total before the bill total.</p>
            </div>

            <div>
              <label className={LABEL} htmlFor="biz-tax">GST rate (%)</label>
              <input
                id="biz-tax"
                type="number"
                min="0"
                max="28"
                step="0.5"
                value={businessInfo.taxRate ?? 0}
                onChange={set('taxRate')}
                className={`${FIELD} num`}
              />
              <p className={HINT}>
                Shown as the GST already included in your prices — it never changes the amount collected.
              </p>
            </div>
          </div>
        </div>
      </Surface>

      {/* Licence & data privacy */}
      <Surface className="flex flex-col items-start justify-between gap-4 bg-gradient-to-br from-[var(--color-brand-deep)] via-[var(--color-brand-deep)] to-slate-900 text-white sm:flex-row sm:items-center">
        <div className="flex items-center gap-3.5">
          <img
            src="/logo.png"
            alt="SwiftBill"
            className="h-12 w-12 rounded-[var(--radius-control)] object-contain ring-2 ring-white/20"
          />
          <div>
            <div className="mb-1 inline-flex items-center gap-1.5 rounded-full bg-[var(--color-in)]/20 px-2 py-0.5 text-micro font-bold tracking-wider text-[var(--color-in-bright)] ring-1 ring-[var(--color-in)]/30">
              MIT LICENCE · FREE &amp; OPEN SOURCE
            </div>
            <h3 className="text-body font-bold">SwiftBill Community Edition</h3>
            <p className="mt-0.5 text-micro text-white/70">
              No subscriptions, no hidden limits. Your books stay on your own device.
            </p>
          </div>
        </div>
        <button
          onClick={() => alert("SwiftBill is free forever. You can contribute code, report bugs, or star the project on GitHub.")}
          className="shrink-0 rounded-[var(--radius-control)] bg-[var(--color-in)] px-4 py-2 text-micro font-bold text-white shadow-e1 transition-opacity hover:opacity-90 cursor-pointer"
        >
          Open source docs
        </button>
      </Surface>
    </div>
  );
}
