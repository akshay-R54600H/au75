# AU75 — Attendance Predictor

Know exactly how many classes you can skip. AU75 syncs attendance and the
dated timetable from the Alliance University student portal, then plans
your skips per subject — with projections before each exam.

**Live:** https://au75.in

- **Web app** — Next.js 14 (App Router) + Tailwind, deployed on Vercel.
- **Phone app** — it's a PWA. "Install app" on Android/Chrome adds it to the
  home screen and it works offline with the last sync. No APK, no Play Store.
- **Portal sync** — three small API routes (`/api/portal/*`) run the
  CAPTCHA → login → OTP flow against the portal. Sessions are stateless
  (AES-GCM sealed tokens), so they work on serverless. Passwords are never
  stored on the server.
- **Storage** — everything lives in the browser (IndexedDB). No accounts, no DB.

## Develop

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # calculation engine + token tests (Node ≥ 22.18)
npm run typecheck
npm run lint
```

## Deploy (Vercel)

1. Push to GitHub, import the repo in Vercel. Framework preset: Next.js. No
   other build settings needed.
2. Add the env var **`PORTAL_SESSION_SECRET`** (any long random string,
   e.g. `openssl rand -base64 32`). Without it, sessions die on cold starts.
3. Point `au75.in` at the project under *Domains*.

Sync route handlers declare `maxDuration = 60` (Vercel Hobby's ceiling).

## Project layout

```
app/              pages (/, /dashboard, /subjects, /calendar, /settings, /policy)
app/api/portal/   session → start → verify  (CAPTCHA, login, OTP)
components/       UI — dashboard, calendar, settings, landing, pwa
lib/calculations  pure engine: percentages, safe skips, verdicts, dates
lib/portal        HTML parsers for the attendance + timetable pages
lib/server        portal HTTP client, stateless session flow, token sealing
lib/storage       IndexedDB
public/sw.js      service worker (app-shell cache) + manifest.json
tests/            node tests, no framework
```

## Feedback

In-app *Feedback* link → https://tally.so/r/aQ1WNX

## License

Private project. AU75 is an independent student project and is not
affiliated with Alliance University.
