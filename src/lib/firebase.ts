import { initializeApp, getApps } from 'firebase/app';
import { getAuth, GoogleAuthProvider, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { initializeFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Public web config (safe to ship; access is governed by Firestore/Storage rules).
export const firebaseConfig = {
  apiKey: 'AIzaSyDMNzFvaP0F0KPl4nTOUD5n8TdQCSAIDIQ',
  authDomain: 'fbla-community-service-hours.firebaseapp.com',
  projectId: 'fbla-community-service-hours',
  storageBucket: 'fbla-community-service-hours.firebasestorage.app',
  messagingSenderId: '338261138111',
  appId: '1:338261138111:web:d55ff69f5f7b4b9e38840a',
  measurementId: 'G-MYCMECQXV0',
};

export const app = getApps()[0] ?? initializeApp(firebaseConfig);
export const auth = getAuth(app);
// Long-polling avoids false "client is offline" behind some school network filters.
export const db = initializeFirestore(app, { experimentalForceLongPolling: true });
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

setPersistence(auth, browserLocalPersistence).catch(() => {});

/** Firestore error → short user-facing text, with the code kept for diagnostics. */
export function describeFirestoreError(err: unknown, fallback = 'Something went wrong. Please try again.'): string {
  const code = (err as any)?.code as string | undefined;
  const msg = String((err as any)?.message || '');
  if (code === 'permission-denied') return 'Firestore rejected this (permission-denied). Make sure the latest firestore.rules are published.';
  if (code === 'failed-precondition') return 'Firestore needs a moment (failed-precondition). Refresh and try again; if it persists a composite index may be required.';
  if (code === 'unavailable') return 'Cannot reach Firestore right now. Check your connection and try again.';
  if (code === 'not-found') return 'That record no longer exists. Refresh to see the latest data.';
  if (code) return `${fallback} (${code}${msg ? ': ' + msg.slice(0, 120) : ''})`;
  return fallback;
}

export function errorCode(err: unknown): string {
  return ((err as any)?.code as string) || 'unknown';
}
