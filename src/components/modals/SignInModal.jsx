import React, { useState } from 'react';
import { Eye, EyeOff, Loader2, Lock, LogIn, Mail, X } from 'lucide-react';
import { useDashboard } from '../../context/DashboardContext';
import {
  createAccountWithEmail,
  describeAuthError,
  sendPasswordReset,
  signInWithEmail,
  signInWithGoogle
} from '../../lib/auth';
import Notice from '../ui/Notice';
import { BUTTON, DIALOG, FIELD, HINT, LABEL } from '../ui/controls';

// The one place an account is made or signed into. Two ways in — a Google
// account, or an email with a password — and the same dialog for both, because
// everything past this point only cares about the uid.
//
// Signing in is never required: this dialog closes to the app exactly as it was.
const COPY = {
  signIn: {
    title: 'Sign in',
    subtitle: 'Your books follow you to every device you sign in from',
    action: 'Sign in',
    switchTo: 'New here? Create an account'
  },
  create: {
    title: 'Create an account',
    subtitle: 'One account keeps this shop’s books on your own devices',
    action: 'Create account',
    switchTo: 'Already have an account? Sign in'
  }
};

// Google's mark, drawn rather than borrowed: it is a brand, not an icon set.
function GoogleMark() {
  return (
    <svg viewBox="0 0 48 48" className="h-4 w-4" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.6l6.7-6.7C35.6 2.6 30.2 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.8 6.1C12.3 13.4 17.6 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.1 24.6c0-1.6-.1-2.8-.4-4.1H24v8.4h12.5c-.3 2.1-1.6 5.2-4.7 7.3l7.6 5.9c4.5-4.2 6.7-10.3 6.7-17.5z" />
      <path fill="#FBBC05" d="M10.4 28.7c-.5-1.5-.8-3-.8-4.7s.3-3.2.8-4.7l-7.8-6.1C1 16.3 0 20 0 24s1 7.7 2.6 10.8l7.8-6.1z" />
      <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.4-5.9l-7.6-5.9c-2 1.4-4.7 2.4-7.8 2.4-6.4 0-11.7-3.9-13.6-9.8l-7.8 6.1C6.5 42.6 14.6 48 24 48z" />
    </svg>
  );
}

export default function SignInModal() {
  const { isSignInOpen, setIsSignInOpen } = useDashboard();

  const [mode, setMode] = useState('signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [reveal, setReveal] = useState(false);
  // Which control is working, so only it shows a spinner and both stay disabled.
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);

  if (!isSignInOpen) return null;

  const copy = COPY[mode];

  const close = () => {
    setIsSignInOpen(false);
    setError(null);
    setNotice(null);
    setPassword('');
    setReveal(false);
    setMode('signIn');
  };

  const switchMode = () => {
    setMode(mode === 'signIn' ? 'create' : 'signIn');
    setError(null);
    setNotice(null);
  };

  const submit = async (event) => {
    event.preventDefault();
    if (!email.trim() || !password) {
      setError('Enter the email address and the password for the account.');
      return;
    }

    setError(null);
    setNotice(null);
    setBusy('email');
    try {
      if (mode === 'create') await createAccountWithEmail(email, password);
      else await signInWithEmail(email, password);
      // The account is live; the app re-scopes its reads from the auth listener.
      close();
    } catch (err) {
      setError(describeAuthError(err));
    } finally {
      setBusy(null);
    }
  };

  const useGoogle = async () => {
    setError(null);
    setNotice(null);
    setBusy('google');
    try {
      await signInWithGoogle();
      close();
    } catch (err) {
      setError(describeAuthError(err));
    } finally {
      setBusy(null);
    }
  };

  const resetPassword = async () => {
    if (!email.trim()) {
      setError('Type the email address of the account first, then ask for the reset link.');
      return;
    }

    setError(null);
    setNotice(null);
    setBusy('reset');
    try {
      await sendPasswordReset(email);
      setNotice(`Reset link sent to ${email.trim()}. Open it to choose a new password.`);
    } catch (err) {
      setError(describeAuthError(err));
    } finally {
      setBusy(null);
    }
  };

  const busyWith = (who) => busy === who;
  const anyBusy = Boolean(busy);

  return (
    <div className={DIALOG.overlaySheet}>
      <div className={`${DIALOG.cardSheet} flex max-h-[90vh] flex-col sm:max-w-md`}>
        <div className={DIALOG.headerSheet}>
          <div className="flex items-center gap-2.5">
            <div className="grid h-8 w-8 place-items-center rounded-[var(--radius-control)] bg-white/10">
              <LogIn className={DIALOG.icon} />
            </div>
            <div className="text-left">
              <h3 className={DIALOG.title}>{copy.title}</h3>
              <p className="text-micro text-white/70">{copy.subtitle}</p>
            </div>
          </div>
          <button onClick={close} className={DIALOG.close} aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={submit} className={`${DIALOG.body} overflow-y-auto text-left`}>
          <button
            type="button"
            onClick={useGoogle}
            disabled={anyBusy}
            className="flex w-full items-center justify-center gap-2.5 rounded-[var(--radius-control)] bg-surface px-4 py-2.5 text-body font-bold text-ink ring-1 ring-hairline/70 transition-all hover:bg-surface-2 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
          >
            {busyWith('google') ? <Loader2 className="h-4 w-4 animate-spin" /> : <GoogleMark />}
            <span>Continue with Google</span>
          </button>

          <div className="flex items-center gap-3">
            <span className="h-px flex-1 bg-hairline/70" />
            <span className="text-micro font-semibold uppercase tracking-wide text-ink-subtle">or use email</span>
            <span className="h-px flex-1 bg-hairline/70" />
          </div>

          <div>
            <label className={LABEL} htmlFor="signin-email">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-2.5 h-4 w-4 text-ink-subtle" />
              <input
                id="signin-email"
                type="email"
                autoComplete="email"
                inputMode="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`${FIELD} pl-9`}
              />
            </div>
          </div>

          <div>
            <label className={LABEL} htmlFor="signin-password">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-2.5 h-4 w-4 text-ink-subtle" />
              <input
                id="signin-password"
                type={reveal ? 'text' : 'password'}
                autoComplete={mode === 'create' ? 'new-password' : 'current-password'}
                placeholder={mode === 'create' ? 'At least 6 characters' : 'Your password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`${FIELD} pl-9 pr-10`}
              />
              <button
                type="button"
                onClick={() => setReveal(!reveal)}
                aria-label={reveal ? 'Hide password' : 'Show password'}
                className="absolute right-2 top-2 rounded-[var(--radius-control)] p-1 text-ink-subtle transition-colors hover:text-ink cursor-pointer"
              >
                {reveal ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {mode === 'create' ? (
              <p className={HINT}>Six characters or more. You can change it later from this dialog.</p>
            ) : (
              <button
                type="button"
                onClick={resetPassword}
                disabled={anyBusy}
                className={`${BUTTON.quiet} mt-1 !px-0`}
              >
                {busyWith('reset') ? 'Sending…' : 'Forgot password?'}
              </button>
            )}
          </div>

          {error && <Notice tone="danger" role="alert">{error}</Notice>}
          {notice && <Notice tone="success">{notice}</Notice>}

          <p className="rounded-[var(--radius-control)] bg-surface-2 px-3 py-2 text-micro text-ink-muted ring-1 ring-hairline/60">
            Signing in puts this shop’s books on your account so other devices can read them.
            You can keep billing without an account — nothing here is required to make a bill.
          </p>

          <div className={DIALOG.footer}>
            <button type="button" onClick={switchMode} disabled={anyBusy} className={`${BUTTON.secondary} flex-1`}>
              {mode === 'signIn' ? 'Create account' : 'Sign in'}
            </button>
            <button type="submit" disabled={anyBusy} className={`${BUTTON.primary} flex-1`}>
              {busyWith('email') ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Working…</span>
                </>
              ) : (
                <span>{copy.action}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
