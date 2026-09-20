import React, { useState } from 'react';
import { LogIn, LogOut, ShieldAlert, X } from 'lucide-react';
import { useDashboard } from '../../context/DashboardContext';

// Sign-in is optional: it attaches the ledger to a Google account (which is what
// the owner-scoped Firestore rules key off), never gates the app. A failure is
// explained here and the seller keeps billing — the worst failure for a billing
// app is a wall in front of a sale.
function explain(err) {
  const code = err?.code || '';
  // Dismissing the popup is a choice, not an error.
  if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') return null;
  if (code === 'auth/operation-not-allowed' || code === 'auth/configuration-not-found') {
    return 'Google sign-in is not enabled for this project yet. In the Firebase console open Authentication, click Get started, then enable Google under Sign-in method.';
  }
  if (code === 'auth/unauthorized-domain') {
    return 'This address is not an authorised sign-in domain for the project. Add it under Authentication → Settings → Authorised domains.';
  }
  if (code === 'auth/popup-blocked') {
    return 'Your browser blocked the sign-in window. Allow pop-ups for this site and try again.';
  }
  if (code === 'auth/network-request-failed') {
    return 'No connection to Google right now. Keep billing — signing in can wait until you are online.';
  }
  // Keep the code for diagnosis, but never the raw `Firebase: Error (...)` text.
  return `Sign-in failed${code ? ` (${code})` : ''}. You can keep using the app and try again later.`;
}

export default function AccountButton() {
  const { user, signIn, signOut } = useDashboard();
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(null);

  const signedIn = Boolean(user);

  const handleClick = async () => {
    setNotice(null);
    setBusy(true);
    try {
      if (signedIn) await signOut();
      else await signIn();
    } catch (err) {
      setNotice(explain(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={handleClick}
        disabled={busy}
        title={
          signedIn
            ? `Signed in as ${user.email || user.uid} — click to sign out`
            : 'Sign in with Google to attach this ledger to your account'
        }
        className="flex items-center gap-1.5 rounded-full p-2 text-white/75 transition-colors hover:bg-white/10 hover:text-white active:bg-white/20 disabled:cursor-wait disabled:opacity-60 cursor-pointer sm:rounded-[var(--radius-control)] sm:px-3 sm:py-2"
      >
        {signedIn ? <LogOut className="w-5 h-5" /> : <LogIn className="w-5 h-5" />}
        <span className="hidden sm:inline text-xs font-semibold">
          {busy ? 'Working…' : signedIn ? 'Sign out' : 'Sign in'}
        </span>
      </button>

      {notice && (
        <div
          role="alert"
          className="absolute right-0 top-full z-50 mt-2 w-64 rounded-[var(--radius-card)] bg-surface p-3 text-micro leading-relaxed text-ink-muted shadow-e3 ring-1 ring-hairline/70 sm:w-80"
        >
          <button
            onClick={() => setNotice(null)}
            aria-label="Dismiss"
            className="absolute right-2 top-2 p-0.5 text-ink-subtle transition-colors hover:text-ink cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
          <p className="flex items-center gap-1.5 pr-5 font-semibold text-ink">
            <ShieldAlert className="h-3.5 w-3.5 shrink-0 text-[var(--color-warn)]" />
            Sign-in unavailable
          </p>
          <p className="mt-1">{notice}</p>
        </div>
      )}
    </div>
  );
}
