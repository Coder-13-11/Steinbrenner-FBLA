/**
 * Every Firestore write in Member Hub lives here so the key sets match
 * firestore.rules exactly. Each function throws on failure; callers show
 * `describeFirestoreError(err)`.
 */
import {
  addDoc, collection, deleteDoc, deleteField, doc, getDoc, getDocs, increment,
  query, serverTimestamp, setDoc, updateDoc, where, writeBatch, Timestamp,
} from 'firebase/firestore';
import { getDownloadURL, ref as storageRef, uploadBytes } from 'firebase/storage';
import type { User } from 'firebase/auth';
import { db, storage } from '@/lib/firebase';
import { makeCheckinCode, checkinWindowOpen } from '@/lib/checkin';
import { POINTS_PER_HOUR, type Attendance, type ChapterEvent, type DuesStatus, type EventSignup, type EventType, type StaffRole, type UserProfile, type WithId } from './types';

const col = (name: string) => collection(db, name);

/* ------------------------------ Hours ------------------------------ */

export async function submitHours(user: User, data: { organization: string; date: string; hours: number; description: string; file?: File | null }) {
  let proofFileURL: string | undefined;
  let proofFileName: string | undefined;
  if (data.file) {
    if (data.file.size > 10 * 1024 * 1024) throw new Error('Proof file must be 10MB or smaller.');
    // Path must match storage.rules: /proof/{uid}/{submissionId}/{fileName}
    const tempId = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : String(Date.now());
    const r = storageRef(storage, `proof/${user.uid}/${tempId}/${data.file.name}`);
    await uploadBytes(r, data.file, { contentType: data.file.type || undefined });
    proofFileURL = await getDownloadURL(r);
    proofFileName = data.file.name;
  }
  await addDoc(col('hourSubmissions'), {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName || user.email,
    organization: data.organization.trim().slice(0, 120),
    date: data.date,
    hours: data.hours,
    description: data.description.trim().slice(0, 1500),
    proofFileURL: proofFileURL ?? null,
    proofFileName: proofFileName ?? null,
    status: 'pending',
    points: null,
    reviewedAt: null,
    reviewedBy: null,
    reviewNote: '',
    submittedAt: serverTimestamp(),
  });
}

export async function withdrawSubmission(id: string) {
  await deleteDoc(doc(db, 'hourSubmissions', id));
}

export async function approveHours(staff: User, id: string, hours: number, uid: string) {
  const batch = writeBatch(db);
  batch.update(doc(db, 'hourSubmissions', id), { status: 'approved', points: hours * POINTS_PER_HOUR, reviewedAt: serverTimestamp(), reviewedBy: staff.email });
  batch.update(doc(db, 'users', uid), { approvedHours: increment(hours), points: increment(hours * POINTS_PER_HOUR) });
  await batch.commit();
}

export async function rejectHours(staff: User, id: string, note: string) {
  await updateDoc(doc(db, 'hourSubmissions', id), { status: 'rejected', points: null, reviewedAt: serverTimestamp(), reviewedBy: staff.email, reviewNote: note.trim().slice(0, 500) });
}

/* ------------------------------ Membership ------------------------------ */

export async function approveMember(staff: User, uid: string) {
  await updateDoc(doc(db, 'users', uid), {
    membershipStatus: 'approved', membershipReviewedBy: staff.email, membershipReviewedAt: serverTimestamp(), membershipNote: '', membershipAppealAt: deleteField(),
  });
}

export async function rejectMember(staff: User, uid: string, note: string) {
  await updateDoc(doc(db, 'users', uid), {
    membershipStatus: 'rejected', membershipReviewedBy: staff.email, membershipReviewedAt: serverTimestamp(), membershipNote: note.trim().slice(0, 500), membershipAppealAt: deleteField(),
  });
}

export async function setDues(uid: string, status: DuesStatus) {
  await updateDoc(doc(db, 'users', uid), { duesStatus: status, duesNote: '' });
}

/** Deletes the profile and cancels active RSVPs (keeps event counts honest). */
export async function removeMember(uid: string) {
  const snap = await getDocs(query(col('eventSignups'), where('uid', '==', uid)));
  const batch = writeBatch(db);
  let ops = 0;
  snap.docs.forEach((d) => {
    const s = d.data() as EventSignup;
    if (s.status === 'signed_up') {
      batch.update(d.ref, { status: 'cancelled' }); ops++;
      if (s.eventId) { batch.update(doc(db, 'chapterEvents', s.eventId), { signupCount: increment(-1) }); ops++; }
    }
  });
  batch.delete(doc(db, 'users', uid)); ops++;
  if (ops > 450) throw new Error('Too many RSVPs to cancel in one step. Contact the webmaster.');
  await batch.commit();
}

/**
 * Advisers only. Grant: create admins/{email} + set users.role. Revoke: delete admins/{email} + role=member.
 * Rules refuse an adviser editing their own admins doc.
 */
export async function changeRole(adviser: User, target: WithId<UserProfile>, nextRole: UserProfile['role']) {
  const emailLower = String(target.emailLower || target.email || '').toLowerCase().trim();
  if (!emailLower) throw new Error('This profile has no email on file.');
  if (target.id === adviser.uid) throw new Error('You cannot change your own role.');
  const batch = writeBatch(db);
  const adminRef = doc(db, 'admins', emailLower);
  if (nextRole === 'member') {
    batch.delete(adminRef);
  } else {
    batch.set(adminRef, { role: nextRole as StaffRole, email: emailLower, uid: target.id, grantedBy: adviser.uid, grantedByEmail: adviser.email, grantedAt: serverTimestamp() });
  }
  batch.update(doc(db, 'users', target.id), { role: nextRole, roleChangedBy: adviser.email, roleChangedAt: serverTimestamp() });
  await batch.commit();
}

/* ------------------------------ Announcements ------------------------------ */

export async function createAnnouncement(staff: User, data: { title: string; body: string; pinned: boolean }) {
  await addDoc(col('announcements'), {
    title: data.title.trim().slice(0, 140), body: data.body.trim().slice(0, 4000), pinned: !!data.pinned, status: 'published',
    createdBy: staff.uid, createdByEmail: staff.email, createdByName: staff.displayName || staff.email, createdAt: serverTimestamp(),
  });
}
export async function updateAnnouncement(id: string, data: { title?: string; body?: string; pinned?: boolean }) {
  await updateDoc(doc(db, 'announcements', id), { ...data, updatedAt: serverTimestamp() });
}
export async function archiveAnnouncement(id: string) {
  await updateDoc(doc(db, 'announcements', id), { status: 'archived', updatedAt: serverTimestamp() });
}
export async function deleteAnnouncement(id: string) {
  await deleteDoc(doc(db, 'announcements', id));
}

/* ------------------------------ Events ------------------------------ */

export async function createEvent(staff: User, data: { title: string; description: string; eventType: EventType; date: string; time: string; location: string; capacity: number; hoursCredit: number }) {
  const start = new Date(`${data.date}T${data.time || '15:30'}:00`);
  if (Number.isNaN(start.getTime())) throw new Error('Pick a valid date and time.');
  await addDoc(col('chapterEvents'), {
    title: data.title.trim().slice(0, 120), description: data.description.trim().slice(0, 2000), eventType: data.eventType,
    startAt: Timestamp.fromDate(start), location: data.location.trim().slice(0, 120),
    capacity: Math.max(0, Math.floor(data.capacity || 0)), hoursCredit: Math.max(0, data.hoursCredit || 0),
    status: 'open', signupCount: 0, createdBy: staff.uid, createdByName: staff.displayName || staff.email, createdAt: serverTimestamp(),
  });
}

export async function updateEvent(id: string, data: Partial<Pick<ChapterEvent, 'title' | 'description' | 'eventType' | 'location' | 'capacity' | 'hoursCredit'>> & { startAt?: Date }) {
  const patch: Record<string, unknown> = { ...data };
  if (data.startAt) patch.startAt = Timestamp.fromDate(data.startAt);
  await updateDoc(doc(db, 'chapterEvents', id), patch);
}

export async function closeEvent(id: string) {
  await updateDoc(doc(db, 'chapterEvents', id), { status: 'closed' });
}
export async function reopenEvent(id: string) {
  await updateDoc(doc(db, 'chapterEvents', id), { status: 'open' });
}

export async function deleteEvent(id: string) {
  const snap = await getDocs(query(col('eventSignups'), where('eventId', '==', id)));
  const batch = writeBatch(db);
  let ops = 0;
  snap.docs.forEach((d) => { if ((d.data() as EventSignup).status === 'signed_up') { batch.update(d.ref, { status: 'cancelled' }); ops++; } });
  batch.delete(doc(db, 'chapterEvents', id)); ops++;
  if (ops > 450) throw new Error('Too many RSVPs to cancel in one step.');
  await batch.commit();
}

/* ------------------------------ RSVP ------------------------------ */

export const signupId = (eventId: string, uid: string) => `${eventId}_${uid}`;

export async function rsvp(user: User, eventId: string) {
  const ref = doc(db, 'eventSignups', signupId(eventId, user.uid));
  const existing = await getDoc(ref).catch(() => null);
  const batch = writeBatch(db);
  if (existing && existing.exists()) {
    batch.update(ref, { status: 'signed_up' });
  } else {
    batch.set(ref, { eventId, uid: user.uid, email: user.email, displayName: user.displayName || user.email, status: 'signed_up', signedUpAt: serverTimestamp() });
  }
  batch.update(doc(db, 'chapterEvents', eventId), { signupCount: increment(1) });
  await batch.commit();
}

export async function cancelRsvp(user: User, eventId: string) {
  const batch = writeBatch(db);
  batch.update(doc(db, 'eventSignups', signupId(eventId, user.uid)), { status: 'cancelled' });
  batch.update(doc(db, 'chapterEvents', eventId), { signupCount: increment(-1) });
  await batch.commit();
}

/* ------------------------------ Check-in ------------------------------ */

export type CheckinResult = { ok: true; event: WithId<ChapterEvent>; already: boolean } | { ok: false; reason: 'no-code' | 'not-active' | 'closed' | 'error'; message: string };

/**
 * Member self check-in by room code. Creates or updates the signup; the rules
 * verify the code and time window server-side too.
 */
export async function memberCheckin(user: User, code: string, events: WithId<ChapterEvent>[]): Promise<CheckinResult> {
  const c = code.trim().toUpperCase();
  if (!c) return { ok: false, reason: 'no-code', message: 'Enter the room code from the meeting.' };
  const ev = events.find((e) => e.checkinEnabled && String(e.checkinCode || '').toUpperCase() === c);
  if (!ev) return { ok: false, reason: 'not-active', message: 'That code is not active. Ask an officer for the current code.' };
  if (!checkinWindowOpen(ev)) return { ok: false, reason: 'closed', message: 'Check-in is only open from 30 minutes before the meeting until 2 hours after it starts.' };

  const sref = doc(db, 'eventSignups', signupId(ev.id, user.uid));
  const eref = doc(db, 'chapterEvents', ev.id);
  let existing: EventSignup | null = null;
  try {
    const s = await getDoc(sref);
    existing = s.exists() ? (s.data() as EventSignup) : null;
  } catch (err) {
    if ((err as any)?.code !== 'permission-denied') throw err;
  }
  if (existing?.attendance === 'present') return { ok: true, event: ev, already: true };

  const stamp = { attendance: 'present' as const, attendanceAt: serverTimestamp(), attendanceBy: 'self', lastCheckinCode: c, status: 'signed_up' as const };
  try {
    if (existing) {
      await updateDoc(sref, stamp);
      if (existing.status === 'cancelled') { try { await updateDoc(eref, { signupCount: increment(1) }); } catch { /* count is best-effort */ } }
    } else {
      await setDoc(sref, { eventId: ev.id, uid: user.uid, email: user.email, displayName: user.displayName || user.email, signedUpAt: serverTimestamp(), walkIn: true, ...stamp });
      try { await updateDoc(eref, { signupCount: increment(1) }); } catch { /* best-effort */ }
    }
  } catch (err) {
    const code = (err as any)?.code;
    // Race: doc appeared between get and set/update
    if (code === 'not-found') {
      await setDoc(sref, { eventId: ev.id, uid: user.uid, email: user.email, displayName: user.displayName || user.email, signedUpAt: serverTimestamp(), walkIn: true, ...stamp });
    } else {
      return { ok: false, reason: 'error', message: code === 'permission-denied' ? 'Check-in was blocked. Confirm you are an approved member and that check-in is still open.' : 'Could not check in. Please try again.' };
    }
  }
  return { ok: true, event: ev, already: false };
}

/* ------------------------------ Staff: check-in + attendance ------------------------------ */

export async function startCheckin(eventId: string, current?: ChapterEvent): Promise<string> {
  if (current?.checkinEnabled && current.checkinCode) return current.checkinCode;
  const code = makeCheckinCode();
  await updateDoc(doc(db, 'chapterEvents', eventId), { checkinEnabled: true, checkinCode: code, checkinRotatedAt: serverTimestamp() });
  return code;
}
export async function rotateCheckin(eventId: string): Promise<string> {
  const code = makeCheckinCode();
  await updateDoc(doc(db, 'chapterEvents', eventId), { checkinEnabled: true, checkinCode: code, checkinRotatedAt: serverTimestamp() });
  return code;
}
export async function endCheckin(eventId: string) {
  await updateDoc(doc(db, 'chapterEvents', eventId), { checkinEnabled: false });
}

export async function setAttendance(staff: User, signupDocId: string, value: Attendance) {
  await updateDoc(doc(db, 'eventSignups', signupDocId), { attendance: value, attendanceAt: serverTimestamp(), attendanceBy: staff.email });
}

export async function markAllAbsent(staff: User, signupDocIds: string[]) {
  const batch = writeBatch(db);
  signupDocIds.slice(0, 400).forEach((id) => batch.update(doc(db, 'eventSignups', id), { attendance: 'absent', attendanceAt: serverTimestamp(), attendanceBy: staff.email }));
  await batch.commit();
}

/** Staff adds a roster member who did not RSVP (rules: walkIn + addedBy required). */
export async function addWalkin(staff: User, eventId: string, member: WithId<UserProfile>, attendance: Attendance = 'present') {
  const batch = writeBatch(db);
  batch.set(doc(db, 'eventSignups', signupId(eventId, member.id)), {
    eventId, uid: member.id, email: member.email || '', displayName: member.displayName || member.email || 'Member',
    status: 'signed_up', signedUpAt: serverTimestamp(), attendance, attendanceAt: serverTimestamp(), attendanceBy: staff.email, walkIn: true, addedBy: staff.uid,
  });
  batch.update(doc(db, 'chapterEvents', eventId), { signupCount: increment(1) });
  await batch.commit();
}

/** Credit the event's suggested hours to every present, not-yet-credited member. Returns count credited. */
export async function creditPresentHours(eventId: string, hours: number): Promise<number> {
  if (!(hours > 0)) return 0;
  const snap = await getDocs(query(col('eventSignups'), where('eventId', '==', eventId)));
  const present = snap.docs.filter((d) => { const s = d.data() as EventSignup; return s.status !== 'cancelled' && s.attendance === 'present' && !s.hoursCredited; });
  if (!present.length) return 0;
  const batch = writeBatch(db);
  present.slice(0, 200).forEach((d) => {
    batch.update(d.ref, { hoursCredited: true });
    batch.update(doc(db, 'users', (d.data() as EventSignup).uid), { approvedHours: increment(hours), points: increment(hours * POINTS_PER_HOUR) });
  });
  await batch.commit();
  return Math.min(present.length, 200);
}
