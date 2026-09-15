import { useEffect, useMemo, useRef, useState } from 'react';
import {
  collection, onSnapshot, orderBy, query, where, limit,
  type Query, type DocumentData, type QuerySnapshot,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { toMillis } from '@/lib/format';
import { checkinWindowOpen } from '@/lib/checkin';
import { useAuth } from '../auth/AuthProvider';
import type { Announcement, ChapterEvent, EventSignup, HourSubmission, StaffRole, UserProfile, WithId } from './types';

export interface Feed<T> {
  docs: WithId<T>[];
  loading: boolean;
  error: string | null;
  /** Bumps to force re-subscribe (used by "Try again"). */
  retry: () => void;
}

/**
 * Subscribe to a query with automatic exponential-backoff resubscribe on error.
 * `key` must change whenever the query semantically changes.
 */
export function useLiveQuery<T = DocumentData>(build: (() => Query<DocumentData> | null), key: string, enabled = true): Feed<T> {
  const [docs, setDocs] = useState<WithId<T>[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);
  const buildRef = useRef(build);
  buildRef.current = build;

  useEffect(() => {
    if (!enabled) { setDocs([]); setLoading(false); setError(null); return; }
    let stopped = false;
    let unsub: (() => void) | null = null;
    let attempt = 0;
    let timer: ReturnType<typeof setTimeout> | null = null;
    setLoading(true);
    setError(null);

    const start = () => {
      if (stopped) return;
      const q = buildRef.current();
      if (!q) { setLoading(false); return; }
      try { unsub?.(); } catch { /* noop */ }
      unsub = onSnapshot(q, (snap: QuerySnapshot<DocumentData>) => {
        attempt = 0;
        setDocs(snap.docs.map((d) => ({ id: d.id, ...(d.data() as T) })));
        setLoading(false);
        setError(null);
      }, (err) => {
        console.error('live query', key, err);
        setError((err as any)?.code || 'error');
        setLoading(false);
        attempt += 1;
        timer = setTimeout(start, Math.min(8000, 700 * 2 ** Math.min(attempt, 4)));
      });
    };
    start();
    return () => { stopped = true; if (timer) clearTimeout(timer); try { unsub?.(); } catch { /* noop */ } };
  }, [key, enabled, nonce]);

  return useMemo(() => ({ docs, loading, error, retry: () => setNonce((n) => n + 1) }), [docs, loading, error]);
}

/* ------------------------------ Member feeds ------------------------------ */

export function useEvents() {
  const feed = useLiveQuery<ChapterEvent>(() => query(collection(db, 'chapterEvents'), orderBy('startAt', 'asc'), limit(120)), 'events');
  const byId = useMemo(() => Object.fromEntries(feed.docs.map((d) => [d.id, d])), [feed.docs]);
  const now = Date.now();
  const upcoming = useMemo(
    () => feed.docs.filter((e) => e.status === 'open' && toMillis(e.startAt) >= now - 6 * 3600_000).sort((a, b) => toMillis(a.startAt) - toMillis(b.startAt)),
    [feed.docs, now],
  );
  const past = useMemo(
    () => feed.docs.filter((e) => !(e.status === 'open' && toMillis(e.startAt) >= now - 6 * 3600_000)).sort((a, b) => toMillis(b.startAt) - toMillis(a.startAt)),
    [feed.docs, now],
  );
  const liveNow = useMemo(() => upcoming.filter((e) => checkinWindowOpen(e)), [upcoming]);
  const next = upcoming.find((e) => toMillis(e.startAt) >= now - 30 * 60_000) || null;
  return { ...feed, byId, upcoming, past, liveNow, next };
}

/** The signed-in member's own signups (all statuses; used for RSVP state and attendance history). */
export function useMySignups() {
  const { user } = useAuth();
  const uid = user?.uid || '';
  const feed = useLiveQuery<EventSignup>(() => (uid ? query(collection(db, 'eventSignups'), where('uid', '==', uid), limit(120)) : null), `mysignups:${uid}`, !!uid);
  const byEvent = useMemo(() => Object.fromEntries(feed.docs.map((d) => [d.eventId, d])), [feed.docs]);
  const active = useMemo(() => feed.docs.filter((d) => d.status === 'signed_up'), [feed.docs]);
  return { ...feed, byEvent, active };
}

export function useMySubmissions() {
  const { user } = useAuth();
  const uid = user?.uid || '';
  const feed = useLiveQuery<HourSubmission>(() => (uid ? query(collection(db, 'hourSubmissions'), where('uid', '==', uid), limit(100)) : null), `mysubs:${uid}`, !!uid);
  const docs = useMemo(() => feed.docs.slice().sort((a, b) => toMillis(b.submittedAt) - toMillis(a.submittedAt)), [feed.docs]);
  return { ...feed, docs };
}

export function useLeaderboard(max = 50) {
  const feed = useLiveQuery<UserProfile>(() => query(collection(db, 'users'), orderBy('points', 'desc'), limit(max)), `lb:${max}`);
  const docs = useMemo(() => feed.docs.filter((u) => !u.membershipStatus || u.membershipStatus === 'approved'), [feed.docs]);
  return { ...feed, docs };
}

export function useAnnouncements() {
  const feed = useLiveQuery<Announcement>(() => query(collection(db, 'announcements'), where('status', '==', 'published'), limit(80)), 'ann');
  const docs = useMemo(
    () => feed.docs.slice().sort((a, b) => (Number(!!b.pinned) - Number(!!a.pinned)) || (toMillis(b.createdAt) - toMillis(a.createdAt))),
    [feed.docs],
  );
  return { ...feed, docs };
}

/* ------------------------------ Staff feeds ------------------------------ */

export function useHourQueue(enabled: boolean) {
  const feed = useLiveQuery<HourSubmission>(() => query(collection(db, 'hourSubmissions'), where('status', '==', 'pending'), limit(100)), 'queue', enabled);
  const docs = useMemo(() => feed.docs.slice().sort((a, b) => toMillis(a.submittedAt) - toMillis(b.submittedAt)), [feed.docs]);
  return { ...feed, docs };
}

export function usePendingMembers(enabled: boolean) {
  const feed = useLiveQuery<UserProfile>(() => query(collection(db, 'users'), where('membershipStatus', '==', 'pending'), limit(100)), 'pending', enabled);
  const docs = useMemo(() => feed.docs.slice().sort((a, b) => {
    const ap = a.membershipAppealAt ? 1 : 0, bp = b.membershipAppealAt ? 1 : 0;
    if (ap !== bp) return bp - ap;
    return toMillis(a.createdAt) - toMillis(b.createdAt);
  }), [feed.docs]);
  return { ...feed, docs };
}

export function useRoster(enabled: boolean) {
  const feed = useLiveQuery<UserProfile>(() => query(collection(db, 'users'), limit(300)), 'roster', enabled);
  const byId = useMemo(() => Object.fromEntries(feed.docs.map((d) => [d.id, d])), [feed.docs]);
  return { ...feed, byId };
}

/** Advisers only: the true staff roster (admins/*). Officers get an empty map. */
export function useAdmins(enabled: boolean) {
  const feed = useLiveQuery<{ role?: StaffRole }>(() => query(collection(db, 'admins'), limit(100)), 'admins', enabled);
  const map = useMemo<Record<string, StaffRole>>(() => {
    const m: Record<string, StaffRole> = {};
    feed.docs.forEach((d) => { m[d.id.toLowerCase()] = d.role === 'officer' ? 'officer' : 'advisor'; });
    return m;
  }, [feed.docs]);
  return { ...feed, map, loaded: enabled && !feed.loading && !feed.error };
}

/** Live signups for one event (attendance view / projector). */
export function useEventSignups(eventId: string | null) {
  const feed = useLiveQuery<EventSignup>(() => (eventId ? query(collection(db, 'eventSignups'), where('eventId', '==', eventId), limit(250)) : null), `signups:${eventId}`, !!eventId);
  const active = useMemo(() => feed.docs.filter((d) => d.status !== 'cancelled'), [feed.docs]);
  return { ...feed, active };
}

/** Effective role for a roster row: real admins doc wins when we can see it. */
export function effectiveRole(u: UserProfile, admins: Record<string, StaffRole> | null): UserProfile['role'] {
  const email = String(u.emailLower || u.email || '').toLowerCase();
  if (admins && email && admins[email]) return admins[email];
  return u.role === 'officer' || u.role === 'advisor' ? u.role : 'member';
}
