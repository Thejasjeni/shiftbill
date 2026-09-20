import React, { useState } from 'react';
import { Building2, Phone, Loader2, Save, RefreshCw, AlertTriangle, CheckCircle2, UserCog } from 'lucide-react';
import { useVendors } from '../../hooks/useVendors';
import { useDashboard } from '../../context/DashboardContext';
import Badge from '../ui/Badge';
import Surface from '../ui/Surface';
import { BUTTON, FIELD, HINT, LABEL } from '../ui/controls';

// ---------------------------------------------------------------------------
// VendorForm — persistent vendor/client form (Name, GST No, Phone).
// Submissions insert into the Firestore `vendors` collection; the list is a
// live view, so data persists across page refreshes.
// ---------------------------------------------------------------------------

const TYPE_OPTIONS = [
  { value: 'customer', label: 'Customer' },
  { value: 'supplier', label: 'Supplier / Vendor' }
];

const GST_RE = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9A-Z]Z[0-9A-Z]$/;

// One notice treatment for the three states this form reports.
const NOTICE = {
  warn: 'bg-[var(--color-warn)]/10 text-[var(--color-warn)] ring-[var(--color-warn)]/25',
  error: 'bg-[var(--color-danger)]/10 text-[var(--color-danger)] ring-[var(--color-danger)]/25',
  ok: 'bg-[var(--color-in)]/10 text-[var(--color-in)] ring-[var(--color-in)]/25'
};

function Notice({ tone, children }) {
  const Icon = tone === 'ok' ? CheckCircle2 : AlertTriangle;
  return (
    <div role={tone === 'ok' ? 'status' : 'alert'} className={`flex items-start gap-2 rounded-[var(--radius-control)] px-3 py-2 text-micro ring-1 ${NOTICE[tone]}`}>
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{children}</span>
    </div>
  );
}

export default function VendorForm() {
  const { vendors, isLoading, error, isSaving, addVendor, refetch } = useVendors();
  const { isFirebaseConfigured } = useDashboard();

  const [name, setName] = useState('');
  const [gstNo, setGstNo] = useState('');
  const [phone, setPhone] = useState('');
  const [type, setType] = useState('customer');
  const [successMsg, setSuccessMsg] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});

  const validate = () => {
    const errs = {};
    if (!name.trim()) errs.name = 'Name is required';
    if (gstNo.trim() && !GST_RE.test(gstNo.trim().toUpperCase())) {
      errs.gstNo = 'Invalid GST format (e.g. 29AABCU9603R1ZM)';
    }
    if (phone.trim() && !/^[0-9+\-\s]{7,15}$/.test(phone.trim())) {
      errs.phone = 'Invalid phone number';
    }
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSuccessMsg(null);
    const errs = validate();
    setFieldErrors(errs);
    if (Object.keys(errs).length > 0) return;

    const vendor = { name: name.trim(), gst_no: gstNo.trim(), phone: phone.trim(), type };

    // Works offline too: Firestore holds the row in its cache and uploads it
    // when a connection returns, so there is no separate queue to feed.
    try {
      await addVendor(vendor);
      setSuccessMsg(
        navigator.onLine
          ? `${vendor.name} saved to the cloud`
          : `${vendor.name} saved on this device — it will upload automatically when you are back online`
      );
      setName(''); setGstNo(''); setPhone('');
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err) {
      setFieldErrors({ form: `Could not save ${vendor.name}: ${err.message}` });
    }
  };

  // Field styling with the error state layered on top of the shared treatment
  const fieldClass = (hasError) => `${FIELD} pl-9 ${hasError ? 'ring-2 ring-[var(--color-danger)]/50' : ''}`;

  return (
    <Surface className="text-left">
      <div className="mb-4 flex items-start justify-between gap-2">
        <div>
          <h2 className="flex items-center gap-2 text-title font-bold text-ink">
            <UserCog className="h-5 w-5 text-[var(--color-brand)]" />
            Vendor &amp; client registry
          </h2>
          <p className="mt-0.5 text-micro text-ink-muted">
            Saved to the cloud — and kept here when you are offline
          </p>
        </div>
        <button
          type="button"
          onClick={refetch}
          disabled={isLoading}
          className={BUTTON.quiet}
          title="Refresh list"
          aria-label="Refresh vendor list"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="mb-4 space-y-2">
        {!isFirebaseConfigured && (
          <Notice tone="warn">
            Cloud saving is off on this device, so this list stays here. Ask whoever set up
            the app to finish the cloud setup to sync it across devices.
          </Notice>
        )}

        {error && (
          <Notice tone="error">
            Could not load the saved list: {error}. Check your connection and tap refresh —
            anything you save now still lands on this device.
          </Notice>
        )}

        {successMsg && (
          <Notice tone="ok">{successMsg}</Notice>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-3.5" noValidate>
        <div>
          <label className={LABEL} htmlFor="vendor-name">Name <span className="text-[var(--color-danger)]">*</span></label>
          <div className="relative">
            <Building2 className="absolute left-3 top-2.5 h-4 w-4 text-ink-subtle" />
            <input
              id="vendor-name"
              type="text"
              placeholder="e.g. Krishna Wholesalers"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={fieldClass(fieldErrors.name)}
            />
          </div>
          {fieldErrors.name && <p className={HINT}>{fieldErrors.name}</p>}
        </div>

        <div>
          <label className={LABEL} htmlFor="vendor-gst">GST No</label>
          <input
            id="vendor-gst"
            type="text"
            placeholder="e.g. 29AABCU9603R1ZM"
            value={gstNo}
            onChange={(e) => setGstNo(e.target.value.toUpperCase())}
            className={`${FIELD} num ${fieldErrors.gstNo ? 'ring-2 ring-[var(--color-danger)]/50' : ''}`}
          />
          {fieldErrors.gstNo && <p className={HINT}>{fieldErrors.gstNo}</p>}
        </div>

        <div>
          <label className={LABEL} htmlFor="vendor-phone">Phone number</label>
          <div className="relative">
            <Phone className="absolute left-3 top-2.5 h-4 w-4 text-ink-subtle" />
            <input
              id="vendor-phone"
              type="tel"
              placeholder="e.g. 98765 43210"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className={`${fieldClass(fieldErrors.phone)} num`}
            />
          </div>
          {fieldErrors.phone && <p className={HINT}>{fieldErrors.phone}</p>}
        </div>

        <div>
          <span className={LABEL}>Type</span>
          <div className="grid grid-cols-2 gap-2">
            {TYPE_OPTIONS.map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setType(opt.value)}
                aria-pressed={type === opt.value}
                className={`rounded-[var(--radius-control)] py-2 text-micro font-bold ring-1 transition-all cursor-pointer ${
                  type === opt.value
                    ? 'bg-[var(--color-brand)] text-white ring-[var(--color-brand)]'
                    : 'bg-surface-2 text-ink-muted ring-hairline/70 hover:text-ink'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {fieldErrors.form && (
          <p role="alert" className={`rounded-[var(--radius-control)] px-3 py-2 text-micro ring-1 ${NOTICE.error}`}>
            {fieldErrors.form}
          </p>
        )}

        <button
          type="submit"
          disabled={isSaving || !isFirebaseConfigured}
          className={`${BUTTON.primary} w-full`}
        >
          {isSaving ? (
            <><Loader2 className="h-4 w-4 animate-spin" /><span>Saving…</span></>
          ) : (
            <><Save className="h-4 w-4" /><span>Save vendor / client</span></>
          )}
        </button>
      </form>

      {/* Saved list — proof of persistence (fetched on mount) */}
      <div className="mt-5 border-t border-hairline/60 pt-4">
        <h3 className="mb-2 text-micro font-bold uppercase tracking-wide text-ink-muted">
          Saved vendors ({vendors.length})
        </h3>
        {isLoading ? (
          <p className="py-3 text-center text-micro text-ink-subtle">Loading from the cloud…</p>
        ) : vendors.length === 0 ? (
          <p className="py-3 text-center text-micro text-ink-subtle">
            Nothing saved yet — add the first vendor above.
          </p>
        ) : (
          <ul className="max-h-48 space-y-1.5 overflow-y-auto pr-1">
            {vendors.map(v => (
              <li key={v.id} className="flex items-center justify-between rounded-[var(--radius-control)] bg-surface-2 px-3 py-2 text-micro">
                <div className="min-w-0">
                  <span className="block truncate font-semibold text-ink">{v.name}</span>
                  <span className="num text-ink-subtle">{v.phone || 'no phone'}{v.gst_no ? ` · ${v.gst_no}` : ''}</span>
                </div>
                <Badge tone={v.type === 'supplier' ? 'out' : 'brand'} className="ml-2 shrink-0">
                  {v.type}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Surface>
  );
}
