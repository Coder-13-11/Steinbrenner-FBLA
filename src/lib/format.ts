import type { Timestamp } from 'firebase/firestore';

export type TsLike = Timestamp | Date | number | { toDate: () => Date } | null | undefined;

export function toDate(ts: TsLike): Date | null {
  if (!ts) return null;
  if (ts instanceof Date) return ts;
  if (typeof ts === 'number') return new Date(ts);
  if (typeof (ts as any).toDate === 'function') return (ts as any).toDate();
  return null;
}

export function toMillis(ts: TsLike): number {
  const d = toDate(ts);
  return d ? d.getTime() : 0;
}

/** "Thu, Sep 18, 3:30 PM" */
export function formatWhen(ts: TsLike): string {
  const d = toDate(ts);
  if (!d) return 'Date TBD';
  return d.toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

/** "3:31 PM" */
export function formatTime(ts: TsLike): string {
  const d = toDate(ts);
  if (!d) return '';
  return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

/** "Sep 18" */
export function formatDay(ts: TsLike): string {
  const d = toDate(ts);
  if (!d) return '';
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

/** Local YYYY-MM-DD (matches <input type="date">). */
export function ymd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function initials(name?: string | null): string {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}

export function firstName(name?: string | null): string {
  return String(name || '').trim().split(/\s+/)[0] || 'them';
}

export function plural(n: number, word: string, pluralWord?: string): string {
  return `${n} ${n === 1 ? word : pluralWord || word + 's'}`;
}

/** Relative time like "2h ago" / "in 3d" */
export function relativeTime(ts: TsLike, now = Date.now()): string {
  const t = toMillis(ts);
  if (!t) return '';
  const diff = t - now;
  const abs = Math.abs(diff);
  const min = 60_000, hr = 3_600_000, day = 86_400_000;
  let s: string;
  if (abs < min) s = 'now';
  else if (abs < hr) s = `${Math.round(abs / min)}m`;
  else if (abs < day) s = `${Math.round(abs / hr)}h`;
  else s = `${Math.round(abs / day)}d`;
  if (s === 'now') return s;
  return diff < 0 ? `${s} ago` : `in ${s}`;
}
