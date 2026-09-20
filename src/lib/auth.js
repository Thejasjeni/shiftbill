import { useEffect, useState } from 'react';
import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut
} from 'firebase/auth';
import { auth } from './firebaseClient';

// ---------------------------------------------------------------------------
// Auth — optional by design.
//
// The app is fully usable with nobody signed in. With no network, no auth
// configuration in the project, or after signing out, `ownerOf()` is null:
// reads stay unscoped and writes land unowned, exactly as they did before
// sign-in existed. That is what keeps the worst failure of a billing app — a
// wall in front of a sale — impossible.
//
// Signing in attaches the ledger to an account — the uid the data layer stamps
// onto new documents and filters reads by, and what lets the owner-scoped rules
// in firestore.rules.owner-scoped be released.
//
// Two ways in, both on the `ap agencies` web app in agencies-web: a Google
// account, or an email address with a password. They are one account to the
// app: everything downstream only ever asks for `uid`.
// ---------------------------------------------------------------------------

let currentUser = null;
const listeners = new Set();

// One auth listener for the whole app; components observe it through
// `useAuthUser()` instead of each talking to Firebase themselves.
function emit(user) {
  currentUser = user || null;
  listeners.forEach((listener) => listener(currentUser));
}

if (auth) {
  onAuthStateChanged(
    auth,
    emit,
    (err) => {
      // No auth configuration for this project, or the network is gone.
      // Nobody is signed in — the app's normal state, not a failure.
      console.warn('Sign-in unavailable:', err?.message || err);
      emit(null);
    }
  );
}

export function ownerOf() {
  return currentUser?.uid || null;
}

export function useAuthUser() {
  const [user, setUser] = useState(currentUser);

  useEffect(() => {
    listeners.add(setUser);
    return () => listeners.delete(setUser);
  }, []);

  return user;
}

function requireAuth() {
  if (!auth) throw new Error('Firebase is not configured, so sign-in is unavailable.');
  return auth;
}

// Firebase treats the address case-insensitively, but it does not forgive the
// spaces a phone keyboard adds, so trim once here rather than in every form.
const clean = (email) => String(email || '').trim();

export async function signInWithEmail(email, password) {
  return signInWithEmailAndPassword(requireAuth(), clean(email), password);
}

export async function createAccountWithEmail(email, password) {
  return createUserWithEmailAndPassword(requireAuth(), clean(email), password);
}

export async function sendPasswordReset(email) {
  return sendPasswordResetEmail(requireAuth(), clean(email));
}

export async function signInWithGoogle() {
  return signInWithPopup(requireAuth(), new GoogleAuthProvider());
}

export async function signOutOwner() {
  if (auth) await signOut(auth);
}

// The one place an auth failure becomes words the seller can act on. Returns
// null for the cases that are not failures at all, so callers can show
// nothing rather than an error.
export function describeAuthError(err) {
  const code = err?.code || '';

  // Dismissing the Google window is a choice, not an error.
  if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') return null;

  switch (code) {
    case 'auth/invalid-email':
      return 'That email address looks incomplete. Check it and try again.';
    case 'auth/missing-password':
      return 'Enter your password.';
    case 'auth/weak-password':
      return 'Use at least 6 characters for the password.';
    case 'auth/email-already-in-use':
      return 'That email already has an account. Switch to Sign in and use its password — or reset the password if you have forgotten it.';
    case 'auth/wrong-password':
    case 'auth/user-not-found':
    case 'auth/invalid-credential':
      return 'That email and password do not match an account. Check both, or use Forgot password.';
    case 'auth/too-many-requests':
      return 'Too many attempts just now. Wait a minute, then try again.';
    case 'auth/account-exists-with-different-credential':
      return 'That email is already registered here with a password. Sign in with the email and password instead.';
    case 'auth/operation-not-allowed':
    case 'auth/configuration-not-found':
      return 'This sign-in method is not enabled for the project yet. The shop keeps working without it.';
    case 'auth/unauthorized-domain':
      return 'This address is not an authorised sign-in domain for the project. Add it under Authentication → Settings → Authorised domains.';
    case 'auth/popup-blocked':
      return 'Your browser blocked the sign-in window. Allow pop-ups for this site and try again.';
    case 'auth/network-request-failed':
      return 'No connection right now. Keep billing — signing in can wait until you are online.';
    default:
      // Keep the code for diagnosis, but never the raw `Firebase: Error (...)` text.
      return `Sign-in failed${code ? ` (${code})` : ''}. You can keep using the app and try again later.`;
  }
}
