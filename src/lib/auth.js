import { useEffect, useState } from 'react';
import { GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { auth } from './firebaseClient';

// ---------------------------------------------------------------------------
// Auth — optional by design.
//
// The app is fully usable with nobody signed in. With no auth configuration in
// the Firebase project (today's state), or after signing out, `ownerOf()` is
// null: reads stay unscoped and writes land unowned, exactly as they did
// before sign-in existed. That is what makes it safe to ship this ahead of the
// console setup it needs.
//
// Signing in attaches the ledger to an account — the uid the data layer stamps
// onto new documents and filters reads by, and what lets the owner-scoped rules
// in firestore.rules.owner-scoped be released.
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
      // No auth configuration for this project yet, or the network is gone.
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

export async function signInWithGoogle() {
  if (!auth) throw new Error('Firebase is not configured, so sign-in is unavailable.');
  return signInWithPopup(auth, new GoogleAuthProvider());
}

export async function signOutOwner() {
  if (auth) await signOut(auth);
}
