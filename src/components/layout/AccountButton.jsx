import React, { useState } from 'react';
import { LogIn, LogOut, ShieldAlert, X } from 'lucide-react';
import { useDashboard } from '../../context/DashboardContext';
import { describeAuthError } from '../../lib/auth';

// Sign-in is optional: it attaches the ledger to an account (which is what the
// owner-scoped Firestore rules key off), never gates the app. The dialog it
// opens owns signing in; only signing out and its failures are handled here, so
// the seller keeps billing whatever happens.
export default function AccountButton() {
  const { user, signOut, setIsSignInOpen } = useDashboard();
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(null);

  const signedIn = Boolean(user);

  const handleClick = async () => {
    setNotice(null);

    // Signing in is a dialog with two providers and a form in it, so it opens
    // rather than firing a popup straight from the top bar.
    if (!signedIn) {
      setIsSignInOpen(true);
      return;
    }

    setBusy(true);
    try {
      await signOut();
    } catch (err) {
      setNotice(describeAuthError(err));
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
            : 'Sign in with Google or an email and password to attach this ledger to your account'
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
