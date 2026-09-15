/**
 * Firestore security rules tests — run against the local emulator:
 *   npm run test:rules
 * These pin the behaviours the app relies on (staff gating, admin grants, check-in window).
 */
import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { initializeTestEnvironment, assertSucceeds, assertFails, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, setDoc, updateDoc, deleteDoc, getDoc, getDocs, collection, writeBatch, serverTimestamp, Timestamp } from 'firebase/firestore';

let env: RulesTestEnvironment;
const PROJECT = 'rules-test';

const ADVISER = { uid: 'adv1', email: 'adviser@school.org' };
const OFFICER = { uid: 'off1', email: 'officer@school.org' };
const MEMBER = { uid: 'mem1', email: 'member@school.org' };
const TARGET = { uid: 'tgt1', email: 'Target.Person@gmail.com' }; // mixed case on purpose

function ctx(u: { uid: string; email: string }, verified = true) {
  return env.authenticatedContext(u.uid, { email: u.email, email_verified: verified }).firestore();
}

async function seed() {
  await env.withSecurityRulesDisabled(async (c) => {
    const db = c.firestore();
    await setDoc(doc(db, 'admins', ADVISER.email.toLowerCase()), { role: 'advisor' });
    await setDoc(doc(db, 'admins', OFFICER.email.toLowerCase()), { role: 'officer' });
    for (const u of [ADVISER, OFFICER, MEMBER, TARGET]) {
      await setDoc(doc(db, 'users', u.uid), {
        uid: u.uid, email: u.email, emailLower: u.email.toLowerCase(), displayName: u.uid,
        approvedHours: 0, points: 0, onboardingComplete: true, role: u === ADVISER ? 'advisor' : u === OFFICER ? 'officer' : 'member',
        membershipStatus: 'approved',
      });
    }
    await setDoc(doc(db, 'chapterEvents', 'ev1'), {
      title: 'Meeting', description: '', eventType: 'meeting', startAt: Timestamp.fromMillis(Date.now() + 5 * 60_000),
      location: 'Room', capacity: 0, hoursCredit: 1, status: 'open', signupCount: 0, createdBy: OFFICER.uid,
      checkinEnabled: true, checkinCode: 'ABC234',
    });
  });
}

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: PROJECT,
    firestore: { rules: readFileSync('firestore.rules', 'utf8'), host: '127.0.0.1', port: 8090 },
  });
});
beforeEach(async () => { await env.clearFirestore(); await seed(); });
afterAll(async () => { await env.cleanup(); });

describe('admins roster', () => {
  it('members cannot list admins; anyone may get their own doc', async () => {
    await assertFails(getDocs(collection(ctx(MEMBER), 'admins')));
    await assertSucceeds(getDoc(doc(ctx(OFFICER), 'admins', OFFICER.email)));
  });
  it('advisers can list admins', async () => {
    await assertSucceeds(getDocs(collection(ctx(ADVISER), 'admins')));
  });
  it('adviser grants officer via batch (admins set + users.role update)', async () => {
    const db = ctx(ADVISER);
    const email = TARGET.email.toLowerCase();
    const b = writeBatch(db);
    b.set(doc(db, 'admins', email), { role: 'officer', email, uid: TARGET.uid, grantedBy: ADVISER.uid, grantedByEmail: ADVISER.email, grantedAt: serverTimestamp() });
    b.update(doc(db, 'users', TARGET.uid), { role: 'officer', roleChangedBy: ADVISER.email, roleChangedAt: serverTimestamp() });
    await assertSucceeds(b.commit());
  });
  it('adviser revokes via batch (admins delete + role=member)', async () => {
    const db = ctx(ADVISER);
    const b = writeBatch(db);
    b.delete(doc(db, 'admins', OFFICER.email));
    b.update(doc(db, 'users', OFFICER.uid), { role: 'member', roleChangedBy: ADVISER.email, roleChangedAt: serverTimestamp() });
    await assertSucceeds(b.commit());
  });
  it('officers cannot grant', async () => {
    const db = ctx(OFFICER);
    await assertFails(setDoc(doc(db, 'admins', TARGET.email.toLowerCase()), { role: 'officer', email: TARGET.email.toLowerCase(), grantedBy: OFFICER.uid }));
  });
  it('adviser cannot touch their own admins doc or change their own users.role', async () => {
    const db = ctx(ADVISER);
    await assertFails(deleteDoc(doc(db, 'admins', ADVISER.email)));
    await assertFails(setDoc(doc(db, 'admins', ADVISER.email), { role: 'advisor', email: ADVISER.email, grantedBy: ADVISER.uid }));
    await assertFails(updateDoc(doc(db, 'users', ADVISER.uid), { role: 'member', roleChangedBy: ADVISER.email, roleChangedAt: serverTimestamp() }));
  });
  it('rejects bad roles and mismatched email/grantedBy', async () => {
    const db = ctx(ADVISER);
    const email = TARGET.email.toLowerCase();
    await assertFails(setDoc(doc(db, 'admins', email), { role: 'god', email, grantedBy: ADVISER.uid }));
    await assertFails(setDoc(doc(db, 'admins', email), { role: 'officer', email: 'other@x.com', grantedBy: ADVISER.uid }));
    await assertFails(setDoc(doc(db, 'admins', email), { role: 'officer', email, grantedBy: 'someone-else' }));
  });
});

describe('membership + dues', () => {
  it('staff approve / reject; members cannot self-approve', async () => {
    await assertSucceeds(updateDoc(doc(ctx(OFFICER), 'users', MEMBER.uid), { membershipStatus: 'rejected', membershipReviewedBy: OFFICER.email, membershipReviewedAt: serverTimestamp(), membershipNote: 'pay dues first please' }));
    await assertFails(updateDoc(doc(ctx(MEMBER), 'users', MEMBER.uid), { membershipStatus: 'approved' }));
  });
  it('staff set dues; members cannot', async () => {
    await assertSucceeds(updateDoc(doc(ctx(OFFICER), 'users', MEMBER.uid), { duesStatus: 'paid', duesNote: '' }));
    // Must be a real change — an identical write has an empty diff and is a harmless no-op.
    await assertFails(updateDoc(doc(ctx(MEMBER), 'users', MEMBER.uid), { duesStatus: 'unpaid', duesNote: '' }));
    await assertFails(updateDoc(doc(ctx(MEMBER), 'users', MEMBER.uid), { approvedHours: 99, points: 990 }));
  });
});

describe('check-in + attendance', () => {
  it('member self check-in with the live code (walk-in create)', async () => {
    const db = ctx(MEMBER);
    await assertSucceeds(setDoc(doc(db, 'eventSignups', `ev1_${MEMBER.uid}`), {
      eventId: 'ev1', uid: MEMBER.uid, email: MEMBER.email, displayName: 'M', status: 'signed_up', signedUpAt: serverTimestamp(),
      attendance: 'present', attendanceAt: serverTimestamp(), attendanceBy: 'self', lastCheckinCode: 'ABC234', walkIn: true,
    }));
  });
  it('member cannot check in with a wrong code or mark themselves present without a code', async () => {
    const db = ctx(MEMBER);
    await assertFails(setDoc(doc(db, 'eventSignups', `ev1_${MEMBER.uid}`), { eventId: 'ev1', uid: MEMBER.uid, email: MEMBER.email, displayName: 'M', status: 'signed_up', attendance: 'present', lastCheckinCode: 'WRONG1', attendanceBy: 'self' }));
    await assertFails(setDoc(doc(db, 'eventSignups', `ev1_${MEMBER.uid}`), { eventId: 'ev1', uid: MEMBER.uid, email: MEMBER.email, displayName: 'M', status: 'signed_up', attendance: 'present' }));
  });
  it('staff add a walk-in for another member; members cannot', async () => {
    const db = ctx(OFFICER);
    const b = writeBatch(db);
    b.set(doc(db, 'eventSignups', `ev1_${MEMBER.uid}`), { eventId: 'ev1', uid: MEMBER.uid, email: MEMBER.email, displayName: 'M', status: 'signed_up', signedUpAt: serverTimestamp(), attendance: 'present', attendanceAt: serverTimestamp(), attendanceBy: OFFICER.email, walkIn: true, addedBy: OFFICER.uid });
    b.update(doc(db, 'chapterEvents', 'ev1'), { signupCount: 1 });
    await assertSucceeds(b.commit());
    await assertFails(setDoc(doc(ctx(MEMBER), 'eventSignups', `ev1_${TARGET.uid}`), { eventId: 'ev1', uid: TARGET.uid, email: TARGET.email, displayName: 'T', status: 'signed_up', attendance: 'present', attendanceBy: MEMBER.email, walkIn: true, addedBy: MEMBER.uid }));
  });
  it('staff credit hours (hoursCredited + user totals)', async () => {
    await env.withSecurityRulesDisabled(async (c) => {
      await setDoc(doc(c.firestore(), 'eventSignups', `ev1_${MEMBER.uid}`), { eventId: 'ev1', uid: MEMBER.uid, email: MEMBER.email, displayName: 'M', status: 'signed_up', attendance: 'present' });
    });
    const db = ctx(OFFICER);
    const b = writeBatch(db);
    b.update(doc(db, 'eventSignups', `ev1_${MEMBER.uid}`), { hoursCredited: true });
    b.update(doc(db, 'users', MEMBER.uid), { approvedHours: 1, points: 10 });
    await assertSucceeds(b.commit());
  });
});
