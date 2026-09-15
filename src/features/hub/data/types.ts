import type { Timestamp } from 'firebase/firestore';

/**
 * Firestore data model. Field names are the contract with firestore.rules —
 * do not rename without updating the rules.
 */

export type Role = 'member' | 'officer' | 'advisor';
export type StaffRole = Exclude<Role, 'member'>;
export type MembershipStatus = 'pending' | 'approved' | 'rejected';
export type DuesStatus = 'paid' | 'unpaid';
export type Attendance = 'present' | 'absent' | 'excused';
export type SubmissionStatus = 'pending' | 'approved' | 'rejected';
export type EventType = 'meeting' | 'service' | 'other';
export type EventStatus = 'open' | 'closed';

export interface UserProfile {
  uid: string;
  email: string;
  emailLower: string;
  displayName: string;
  photoURL?: string;
  approvedHours: number;
  points: number;
  onboardingComplete: boolean;
  grade?: string;
  instagram?: string;
  interests?: string[];
  phone?: string;
  role: Role;
  membershipStatus: MembershipStatus;
  membershipReviewedBy?: string;
  membershipReviewedAt?: Timestamp;
  membershipNote?: string;
  membershipAppealAt?: Timestamp;
  duesStatus?: DuesStatus;
  duesNote?: string;
  roleChangedBy?: string;
  roleChangedAt?: Timestamp;
  createdAt?: Timestamp;
  lastLogin?: Timestamp;
}

export interface AdminDoc {
  role?: StaffRole;
  email?: string;
  uid?: string;
  grantedBy?: string;
  grantedByEmail?: string;
  grantedAt?: Timestamp;
}

export interface HourSubmission {
  uid: string;
  email: string;
  displayName?: string;
  organization: string;
  date: string; // YYYY-MM-DD
  hours: number;
  description: string;
  proofFileURL?: string;
  proofFileName?: string;
  status: SubmissionStatus;
  points: number | null;
  submittedAt?: Timestamp;
  reviewedAt?: Timestamp;
  reviewedBy?: string | null;
  reviewNote?: string;
}

export interface ChapterEvent {
  title: string;
  description: string;
  eventType: EventType;
  startAt: Timestamp;
  endAt?: Timestamp;
  location: string;
  capacity: number; // 0 = unlimited
  hoursCredit: number;
  status: EventStatus;
  signupCount: number;
  createdBy: string;
  createdByName?: string;
  createdAt?: Timestamp;
  checkinEnabled?: boolean;
  checkinCode?: string;
  checkinRotatedAt?: Timestamp;
}

export interface EventSignup {
  eventId: string;
  uid: string;
  email: string;
  displayName: string;
  status: 'signed_up' | 'cancelled';
  signedUpAt?: Timestamp;
  attendance?: Attendance;
  attendanceAt?: Timestamp;
  attendanceBy?: string; // 'self' or staff email
  lastCheckinCode?: string;
  hoursCredited?: boolean;
  walkIn?: boolean;
  addedBy?: string;
}

export interface Announcement {
  title: string;
  body: string;
  pinned: boolean;
  status: 'published' | 'archived';
  createdBy: string;
  createdByEmail: string;
  createdByName?: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

/** A Firestore doc with its id attached. */
export type WithId<T> = T & { id: string };

export const TIERS = [
  { key: 'bronze', name: 'Bronze', hours: 10 },
  { key: 'silver', name: 'Silver', hours: 25 },
  { key: 'gold', name: 'Gold', hours: 50 },
  { key: 'platinum', name: 'Platinum', hours: 100 },
] as const;

export const POINTS_PER_HOUR = 10;

export const ROLE_LABEL: Record<Role, string> = { member: 'Member', officer: 'Officer', advisor: 'Adviser' };

export const ROLE_POWERS: Record<StaffRole, string[]> = {
  officer: [
    'Approve or reject membership requests and volunteer hours',
    'Create events, run check-in, and mark attendance',
    'Post announcements and mark dues paid',
    'Remove members from the chapter',
  ],
  advisor: [
    'Everything an officer can do',
    'Grant or revoke officer and adviser access for anyone',
    'This is the highest level of access in Member Hub',
  ],
};

export const INTEREST_OPTIONS = ['Competitive Events', 'Community Service', 'Leadership', 'Networking', 'Fundraising'] as const;
export const GRADE_OPTIONS = ['9', '10', '11', '12', 'Alumni / Other'] as const;
