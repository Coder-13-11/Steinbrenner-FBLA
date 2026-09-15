export type EventCategory = 'objective' | 'presentation' | 'roleplay' | 'chapter' | 'production';

export interface CompetitiveEvent {
  /** Official event name as listed by FBLA. */
  name: string;
  category: EventCategory;
  /** One or two sentences, student-facing. */
  description: string;
  /** e.g. "Individual", "Team", "Individual or Team". Omit = Individual. */
  team?: string;
  /** Grade eligibility note if restricted (e.g. "Grades 9–10 only"). */
  eligibility?: string;
  /** Prejudged / production / has objective-test component etc. */
  tags?: string[];
  /** connect.fbla.org blob id for the official national guideline PDF. */
  natPdf?: number;
  /** flfbla.org page slug for Florida guidelines. */
  flSlug?: string;
  /** Extra links: { label, url } */
  links?: Array<{ label: string; url: string }>;
  /** true if new for the current season; string = note (e.g. "Renamed from X"). */
  isNew?: boolean | string;
}

export const CATEGORY_LABEL: Record<EventCategory, string> = {
  objective: 'Objective Test',
  presentation: 'Presentation',
  roleplay: 'Role Play',
  chapter: 'Chapter Event',
  production: 'Production',
};

/* Official resource hubs (national + Florida). */
export const RES = {
  hub: 'https://www.fbla.org/high-school/competitive-events/',
  allGuidelines: 'https://connect.fbla.org/headquarters/files/High%20School%20Competitive%20Events%20Resources/25-26-High-School-Guidelines-All-in-One.pdf',
  files: 'https://connect.fbla.org/files?folderId=344',
  flHub: 'https://www.flfbla.org/competitive-event-guidelines',
  flRating: 'https://www.flfbla.org/competitive-event-rating-sheets',
  blob: 'https://connect.fbla.org/headquarters/blob.php?systemFolder=files&id=',
};

export function natPdfUrl(e: CompetitiveEvent): string {
  return e.natPdf ? RES.blob + e.natPdf : RES.allGuidelines;
}
export function flGuideUrl(e: CompetitiveEvent): string {
  return e.flSlug ? `https://www.flfbla.org/${e.flSlug}` : RES.flHub;
}
export function eventSlug(name: string): string {
  return name.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}
