import { toMillis, type TsLike } from './format';

/** Check-in is open from 30 min before start until 2 h after start — mirrors firestore.rules checkinWindowOpen(). */
export const CHECKIN_OPENS_BEFORE_MS = 30 * 60 * 1000;
export const CHECKIN_CLOSES_AFTER_MS = 2 * 60 * 60 * 1000;

export interface CheckinEventLike {
  checkinEnabled?: boolean;
  checkinCode?: string;
  startAt?: TsLike;
}

export function checkinWindowOpen(ev: CheckinEventLike | null | undefined, now = Date.now()): boolean {
  if (!ev || !ev.checkinEnabled || !ev.checkinCode) return false;
  const start = toMillis(ev.startAt);
  if (!start) return false;
  return now >= start - CHECKIN_OPENS_BEFORE_MS && now <= start + CHECKIN_CLOSES_AFTER_MS;
}

export function checkinClosesAt(ev: CheckinEventLike): Date | null {
  const start = toMillis(ev.startAt);
  return start ? new Date(start + CHECKIN_CLOSES_AFTER_MS) : null;
}

/** 6 chars from an unambiguous alphabet (no 0/O/1/I). */
export function makeCheckinCode(len = 6): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  const rnd = typeof crypto !== 'undefined' && crypto.getRandomValues ? crypto.getRandomValues(new Uint32Array(len)) : null;
  for (let i = 0; i < len; i++) {
    const r = rnd ? rnd[i] / 2 ** 32 : Math.random();
    out += chars[Math.floor(r * chars.length)];
  }
  return out;
}

export function checkinUrl(code: string, origin = typeof location !== 'undefined' ? location.origin : ''): string {
  const base = origin && origin.startsWith('http') ? origin : 'https://steinbrennerfbla.com';
  return `${base}/memberhub/checkin?code=${encodeURIComponent(code)}`;
}
