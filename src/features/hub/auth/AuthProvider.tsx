import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  updateProfile,
  signOut as fbSignOut,
  type User,
} from 'firebase/auth';
import { doc, getDoc, getDocFromServer, onSnapshot, serverTimestamp, setDoc, updateDoc, deleteField } from 'firebase/firestore';
import { auth, db, googleProvider } from '@/lib/firebase';
import type { StaffRole, UserProfile } from '../data/types';

/**
 * Hub session state machine.
 *
 *  boot ──► out ──(sign in)──► verify ──(email verified)──► onboard ──► pending ──(staff approves)──► in
 *                                                     └── staff accounts skip pending (auto-approved)
 */
export type HubStage = 'boot' | 'out' | 'verify' | 'onboard' | 'pending' | 'in';

export interface AuthState {
  stage: HubStage;
  user: User | null;
  profile: UserProfile | null;
  isStaff: boolean;
  staffRole: StaffRole | null;
  /** Non-fatal message to show on the sign-in screen (e.g. profile load failure). */
  notice: string | null;
}

export interface AuthApi extends AuthState {
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  createAccount: (name: string, email: string, password: string) => Promise<void>;
  resendVerification: () => Promise<void>;
  checkVerified: () => Promise<boolean>;
  completeOnboarding: (data: { displayName: string; grade: string; instagram: string; interests: string[] }) => Promise<void>;
  refreshMembership: () => Promise<void>;
  reapplyMembership: (note: string) => Promise<void>;
  signOut: () => Promise<void>;
  /** Skip the "restoring session" screen and show sign-in (user-initiated). */
  leaveBoot: () => void;
}

const Ctx = createContext<AuthApi | null>(null);

export function useAuth(): AuthApi {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAuth must be used inside <AuthProvider>');
  return v;
}

/** Resolve staff role from admins/{emailLower}. Missing `role` on an admin doc ⇒ advisor (back-compat). */
async function resolveStaff(emailLower: string): Promise<StaffRole | null> {
  try {
    const snap = await getDoc(doc(db, 'admins', emailLower));
    if (!snap.exists()) return null;
    const r = (snap.data() || {}).role;
    return r === 'officer' || r === 'advisor' ? r : 'advisor';
  } catch (err) {
    // A failed read (offline) must not silently strip staff; the profile listener re-checks later.
    console.warn('resolveStaff failed', err);
    return null;
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Load (or create) the user's profile, migrate legacy docs, and sync the staff
 * roster → role badge + auto-approval. Mirrors the rules' allowed key sets.
 */
async function loadProfile(user: User, pendingName: string | null): Promise<{ profile: UserProfile; staffRole: StaffRole | null }> {
  const email = user.email!;
  const emailLower = email.toLowerCase();
  const ref = doc(db, 'users', user.uid);
  await user.getIdToken(true);
  let lastErr: unknown = null;

  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      let snap;
      try { snap = await getDocFromServer(ref); } catch { snap = await getDoc(ref); }

      if (!snap.exists()) {
        const displayName = pendingName || user.displayName || '';
        const staffRole = await resolveStaff(emailLower);
        const base: UserProfile = {
          uid: user.uid, email, emailLower, displayName,
          photoURL: user.photoURL || '',
          approvedHours: 0, points: 0, onboardingComplete: false,
          grade: '', instagram: '', interests: [],
          role: 'member', membershipStatus: 'pending',
        };
        await setDoc(ref, { ...base, createdAt: serverTimestamp(), lastLogin: serverTimestamp() });
        if (staffRole) {
          await updateDoc(ref, { membershipStatus: 'approved', role: staffRole, displayName, lastLogin: serverTimestamp() });
          return { profile: { ...base, role: staffRole, membershipStatus: 'approved' }, staffRole };
        }
        return { profile: base, staffRole: null };
      }

      let profile = snap.data() as UserProfile;
      if (!profile.membershipStatus) {
        // One-time migration for profiles created before membership gates
        const status = profile.onboardingComplete ? 'approved' : 'pending';
        await updateDoc(ref, { membershipStatus: status, role: profile.role || 'member', photoURL: user.photoURL || '', lastLogin: serverTimestamp() });
        profile = { ...profile, membershipStatus: status, role: profile.role || 'member' };
      } else {
        await updateDoc(ref, { photoURL: user.photoURL || '', lastLogin: serverTimestamp() });
      }

      const staffRole = await resolveStaff(emailLower);
      if (staffRole) {
        const patch: Partial<UserProfile> = {};
        if (profile.membershipStatus !== 'approved') patch.membershipStatus = 'approved';
        if (profile.role !== staffRole) patch.role = staffRole;
        if (Object.keys(patch).length) {
          await updateDoc(ref, patch as any);
          profile = { ...profile, ...patch };
        }
      }
      return { profile, staffRole };
    } catch (err) {
      lastErr = err;
      const msg = String((err as any)?.message || err);
      const offline = /offline|unavailable|Failed to get document/i.test(msg);
      if (!offline || attempt === 4) break;
      await sleep(400 * attempt);
    }
  }
  throw lastErr;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ stage: 'boot', user: null, profile: null, isStaff: false, staffRole: null, notice: null });
  const pendingNameRef = useRef<string | null>(null);
  const bootLeftRef = useRef(false);

  const enter = useCallback(async (user: User) => {
    if (!user.email) return;
    if (!user.emailVerified) {
      setState((s) => ({ ...s, stage: 'verify', user, profile: null, isStaff: false, staffRole: null }));
      return;
    }
    try {
      const { profile, staffRole } = await loadProfile(user, pendingNameRef.current);
      pendingNameRef.current = null;
      const isStaff = !!staffRole;
      let stage: HubStage = 'in';
      if (!profile.onboardingComplete) stage = 'onboard';
      else if (!isStaff && profile.membershipStatus !== 'approved') stage = 'pending';
      setState({ stage, user, profile, isStaff, staffRole, notice: null });
    } catch (err) {
      console.error('Failed to load profile', err);
      setState({ stage: 'out', user: null, profile: null, isStaff: false, staffRole: null, notice: 'Could not load your profile. Please try again.' });
    }
  }, []);

  // Auth listener
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (!user) {
        setState((s) => ({ stage: 'out', user: null, profile: null, isStaff: false, staffRole: null, notice: s.notice }));
        return;
      }
      void enter(user);
    });
    // If session restore hangs (blocked network), let the user proceed to sign-in.
    const t = setTimeout(() => {
      if (!bootLeftRef.current) setState((s) => (s.stage === 'boot' ? { ...s, stage: 'out' } : s));
    }, 6000);
    return () => { unsub(); clearTimeout(t); };
  }, [enter]);

  // Live profile: keeps role badge / points fresh and boots members whose approval is revoked.
  useEffect(() => {
    if (!state.user || (state.stage !== 'in' && state.stage !== 'pending' && state.stage !== 'onboard')) return;
    const ref = doc(db, 'users', state.user.uid);
    return onSnapshot(ref, (snap) => {
      if (!snap.exists()) return;
      const data = snap.data() as UserProfile;
      setState((s) => {
        if (!s.user) return s;
        let stage = s.stage;
        if (stage === 'in' && !s.isStaff && data.membershipStatus && data.membershipStatus !== 'approved') stage = 'pending';
        if (stage === 'pending' && (data.membershipStatus === 'approved' || s.isStaff) && data.onboardingComplete) stage = 'in';
        return { ...s, stage, profile: { ...s.profile, ...data } as UserProfile };
      });
    }, (err) => console.warn('profile listener', err));
  }, [state.user, state.stage]);

  const api = useMemo<AuthApi>(() => ({
    ...state,
    leaveBoot: () => { bootLeftRef.current = true; setState((s) => (s.stage === 'boot' ? { ...s, stage: 'out' } : s)); },
    async signInWithGoogle() {
      await signInWithPopup(auth, googleProvider);
    },
    async signInWithEmail(email, password) {
      const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
      if (!cred.user.emailVerified) {
        try { await sendEmailVerification(cred.user); } catch { /* rate-limited; user can resend */ }
      }
    },
    async createAccount(name, email, password) {
      pendingNameRef.current = name.trim() || null;
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
      if (name.trim()) { try { await updateProfile(cred.user, { displayName: name.trim() }); } catch { /* non-fatal */ } }
      await sendEmailVerification(cred.user);
    },
    async resendVerification() {
      if (auth.currentUser) await sendEmailVerification(auth.currentUser);
    },
    async checkVerified() {
      const u = auth.currentUser;
      if (!u) return false;
      await u.reload();
      if (u.emailVerified) { await enter(u); return true; }
      return false;
    },
    async completeOnboarding({ displayName, grade, instagram, interests }) {
      const u = auth.currentUser;
      if (!u) return;
      await updateDoc(doc(db, 'users', u.uid), {
        displayName: displayName.trim().slice(0, 80),
        grade: grade.trim(),
        instagram: instagram.replace(/^@/, '').trim().slice(0, 40),
        interests: interests.slice(0, 8),
        onboardingComplete: true,
        lastLogin: serverTimestamp(),
      });
      if (displayName.trim() && u.displayName !== displayName.trim()) {
        try { await updateProfile(u, { displayName: displayName.trim() }); } catch { /* non-fatal */ }
      }
      await enter(u);
    },
    async refreshMembership() {
      const u = auth.currentUser;
      if (u) await enter(u);
    },
    async reapplyMembership(note) {
      const u = auth.currentUser;
      if (!u) return;
      await updateDoc(doc(db, 'users', u.uid), {
        membershipStatus: 'pending',
        membershipNote: note.trim().slice(0, 500),
        membershipAppealAt: serverTimestamp(),
      });
      await enter(u);
    },
    async signOut() {
      await fbSignOut(auth);
      setState({ stage: 'out', user: null, profile: null, isStaff: false, staffRole: null, notice: null });
    },
  }), [state, enter]);

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

/** Firebase Auth error → friendly copy (kept in one place for both sign-in and sign-up). */
export function authErrorMessage(err: unknown): string {
  const code = String((err as any)?.code || '');
  switch (code) {
    case 'auth/invalid-email': return 'That email address does not look right.';
    case 'auth/user-disabled': return 'This account has been disabled. Contact the adviser.';
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
    case 'auth/invalid-login-credentials': return 'Email or password is incorrect.';
    case 'auth/email-already-in-use': return 'An account with this email already exists. Sign in instead.';
    case 'auth/weak-password': return 'Use a password with at least 6 characters.';
    case 'auth/too-many-requests': return 'Too many attempts. Wait a minute and try again.';
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request': return 'Sign-in was cancelled.';
    case 'auth/popup-blocked': return 'Your browser blocked the sign-in popup. Allow popups for this site and try again.';
    case 'auth/unauthorized-domain': return 'This domain is not authorized for sign-in yet. Ask the webmaster to add it in Firebase Auth settings.';
    case 'auth/network-request-failed': return 'Network error. Check your connection and try again.';
    default: return 'Could not sign in. Please try again.';
  }
}

export { deleteField };
