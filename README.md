# Steinbrenner FBLA

The official website and **Member Hub** for the Steinbrenner High School chapter of
Future Business Leaders of America (Lutz, FL). Live at https://steinbrennerfbla.com.

- **Public site** — chapter info, officers, the full FBLA competitive events catalog with
  official guideline links, join steps, contact + FAQ.
- **Member Hub** (`/memberhub`) — sign in, RSVP to chapter events, QR/room-code meeting
  check-in, volunteer-hour logging with proof uploads, leaderboard, announcements, and a
  staff command center (approvals, dues, attendance, projector, roles) for officers/advisers.

## Stack

Vite · React 18 · TypeScript · Tailwind CSS · React Router · Firebase (Auth, Firestore,
Storage) · framer-motion · lucide-react. Hosted on Vercel (SPA rewrite in `vercel.json`).

## Develop

```bash
npm install
npm run dev          # http://localhost:5173 (or the port Vite prints)
npm run typecheck    # tsc --noEmit
npm test             # unit tests (vitest)
npm run test:rules   # Firestore security-rules tests (starts the emulator; needs Java)
npm run build        # production build → dist/
```

Architecture, conventions, and the data model are documented in
[`src/README-AGENTS.md`](src/README-AGENTS.md).

## Deploy

Pushes to `main` deploy to Vercel automatically (framework: Vite, output `dist/`).

**Firestore/Storage rules do not deploy with the site.** After changing `firestore.rules`
or `storage.rules`, publish them in the Firebase console (Firestore → Rules → Publish), or:

```bash
npx firebase login
npx firebase deploy --only firestore:rules,storage
```

## Staff roles

Staff access is the `admins/{lowercase-email}` collection (`{ role: "officer" | "advisor" }`).
Bootstrap the first adviser from the Firebase console; after that, advisers grant/revoke
roles from **Member Hub → Staff → Members → Manage** (typed-sentence confirmation; enforced
by the rules — advisers can never edit their own admin doc).

## Legacy

The previous single-file site is kept at `legacy/index.html` for reference only.
