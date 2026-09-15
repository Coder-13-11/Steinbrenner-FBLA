# Steinbrenner FBLA — app architecture & contributor contract

Vite + React 18 + TypeScript + Tailwind 3 + React Router 6 + Firebase 10 (modular).
Hosted on Vercel (`vercel.json` rewrites everything to `index.html`). Public assets are
served from `public/assets/...` at the same URLs as the legacy site.

The legacy single-file site is preserved at `legacy/index.html` — use it as the source
of truth for **copy, data, and behaviour**. Do not link to it or import from it.

## Layout

```
src/
  main.tsx, App.tsx                 routes + providers (SHARED — do not edit)
  styles/globals.css                design tokens + component classes (SHARED)
  lib/                              cn, format, checkin, csv, phrase, seo, firebase (SHARED)
  data/                             site.ts, officers.ts, faqs.ts, events.ts, events.types.ts
  components/ui/index.tsx           UI kit (SHARED): Button, Pill, PillButton, Seg, Card, SectionCard,
                                    Count, Stat, Field, Input, Textarea, Select, Chip, Spinner,
                                    EmptyState, ErrorNote, Kicker, Modal, Reveal, Avatar
  components/ui/providers.tsx       useToast(), useConfirm(), useTheme() (SHARED)
  components/layout/                Nav, Footer, ParticleCanvas, MarketingLayout (+ anything marketing needs)
  features/marketing/pages/         Home, About, Events, Gallery, Join, Contact, NotFound
  features/hub/HubApp.tsx           hub shell: auth stage switch, app bar, tabs, nested routes (SHARED)
  features/hub/auth/AuthProvider.tsx useAuth() (SHARED)
  features/hub/auth/screens.tsx     BootScreen, SignInScreen, VerifyEmailScreen, OnboardingScreen, PendingScreen
  features/hub/data/types.ts        Firestore model + constants (SHARED)
  features/hub/data/hooks.ts        realtime feeds (SHARED)
  features/hub/data/mutations.ts    every Firestore write (SHARED)
  features/hub/pages/               member pages
  features/hub/components/          hub-shared presentational components (owned by hub-member)
  features/hub/staff/               staff pages/components
```

**Ownership** (each agent edits only its own files; never touch SHARED files — if you truly
need a change there, implement a local workaround in your own directory and call it out in
your final report):

| Agent        | Owns                                                                 |
|--------------|----------------------------------------------------------------------|
| marketing    | `components/layout/*` (except MarketingLayout.tsx), `features/marketing/**` |
| events-2627  | `data/events.ts` only                                                |
| hub-member   | `features/hub/auth/screens.tsx`, `features/hub/pages/**`, `features/hub/components/**` |
| hub-staff    | `features/hub/staff/**`                                              |

Verification: `npx tsc --noEmit` must pass. Add `*.test.ts` next to pure logic if useful
(`npx vitest run`). Do **not** run `vite build`, start dev servers, or use browser tools —
the lead does visual QA.

## Design language

- Brand: navy `#05102a` background, gold `#d4a017 / #f0c040` accents, white ink. Fonts:
  **Outfit** (UI/body) and **Bebas Neue** (`font-display`) for big marketing headlines only.
- The hub supports **light mode** via `data-theme="light"` on `<html>`. Only use
  theme-aware colors in hub code: `bg-bg`, `bg-panel`, `text-ink`, `text-muted`, `text-faint`,
  `hairline`, `surface`, `surface-2`, `card`, `card-2`, `text-ok/warn/info/danger`, `text-gold-2`.
  Never hard-code `text-white` or `rgba(255,255,255,…)` in hub code. Marketing pages are always
  dark and may use `text-white/…` freely.
- Component classes in `globals.css`: `.btn-gold .btn-ghost .btn-danger .btn-reject .btn-sm .btn-xs`,
  `.input .label`, `.pill .pill-ok/.pill-warn/.pill-info/.pill-danger/.pill-gold .plain`,
  `.seg`, `.card .card-2`, `.kicker`, `.display`, `.table`, `.page-banner`.
- Prefer the React primitives in `components/ui` over raw classes.
- Icons: `lucide-react`. Motion: `framer-motion`, restrained (fade/slide ≤ 0.6s, respect
  reduced motion; `<Reveal>` for scroll reveals).
- Spacing rhythm: 4/8-based Tailwind scale. Cards `rounded-xl2` (18px). Max widths: `max-w-site`
  (1200) marketing, `max-w-hub` (1040) hub.
- Every interactive element: visible focus, ≥ 36px hit target on touch, `aria-*` where relevant.
- Responsive: phone-first; no horizontal scroll at 375px (tables go in `overflow-x-auto`).
- Copy tone: confident, concise, student-facing. No lorem ipsum; port real copy from legacy.
- Empty/loading/error states are mandatory for every feed (`EmptyState`, `Spinner`, `ErrorNote`).

## Hub conventions

- `const { user, profile, isStaff, staffRole, stage } = useAuth()`.
- Feeds: `useEvents()`, `useMySignups()`, `useMySubmissions()`, `useLeaderboard()`,
  `useAnnouncements()`; staff: `useHourQueue(isStaff)`, `usePendingMembers(isStaff)`,
  `useRoster(isStaff)`, `useAdmins(staffRole==='advisor')`, `useEventSignups(eventId)`.
  Each returns `{ docs, loading, error, retry, ... }`. Never call `onSnapshot` directly in pages.
- Writes: import from `features/hub/data/mutations.ts`. Wrap in try/catch, then
  `toast.err(describeFirestoreError(err))` from `@/lib/firebase`. Show optimistic UI only
  where the legacy site did (attendance seg).
- Confirmations: `const confirm = useConfirm(); const r = await confirm({ title, body, danger,
  confirmText, phrase?, input? }); if (!r.ok) return;`. Never use `window.confirm/prompt`.
- Business rules (see `lib/checkin.ts`, `data/types.ts`): 1 hour = 10 points; tiers 10/25/50/100;
  check-in window −30 min … +2 h around `startAt`; a member cannot award themselves hours.
- Firestore rules are in `/firestore.rules`. Key sets in `mutations.ts` already match them —
  do not add fields to writes.
- Routes (inside `/memberhub`): `/` overview, `/calendar`, `/events`, `/checkin?code=`, `/hours`,
  `/announcements`, `/leaderboard`, `/activity`, `/staff`, `/staff/attendance/:eventId`,
  `/staff/projector/:eventId` (full-screen; rendered without the shell).

## Marketing conventions

- Routes: `/`, `/about`, `/events`, `/events/:slug` (deep link to one competitive event —
  slug via `eventSlug(name)`), `/gallery`, `/join`, `/contact`, `*` NotFound.
- Use `usePageMeta(title, description)` from `@/lib/seo` on every page.
- Use `<Link>`/`<NavLink>` — never `<a onClick>` for internal navigation.
- Data: `SITE`, `NAV_LINKS` (`@/data/site`), `OFFICERS`, `ADVISER`, `FAQS`, `EVENTS`,
  `CATEGORY_LABEL`, `natPdfUrl()`, `flGuideUrl()`, `eventSlug()`, `RES`.
