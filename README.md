# Onyx

[![CI](https://github.com/MustafaNazeer/Onyx/actions/workflows/ci.yml/badge.svg)](https://github.com/MustafaNazeer/Onyx/actions/workflows/ci.yml)

A dark, iPhone first strength progress tracker, built as an installable Progressive Web App. Create workout routines, log your sets, reps, weight, and reps in reserve during a session, time your rest between sets, and watch your strength trend over time in plain language.

Onyx is a private app for a small group of users. Each person has their own account and their own isolated data, enforced at the database level.

[docs/case-study.md](docs/case-study.md) is a short account of how it was built, centered on the hardest part: making the workout logging screen work with no connection.

## Tech stack

- Next.js (App Router) and TypeScript
- Tailwind CSS
- Supabase (Postgres, Auth, Row Level Security)
- Recharts for progress charts
- Web Push (VAPID) for notifications
- Upstash QStash to schedule the rest timer notification
- Vercel for hosting

## Prerequisites

- Node.js 20.9 or newer (what Next.js 16 requires; CI and Vercel run 24)
- A free Supabase account
- A free Vercel account (for deployment)

## Local setup

1. Clone the repository and install dependencies:

   ```bash
   git clone https://github.com/MustafaNazeer/Onyx.git
   cd Onyx
   npm install
   ```

2. Create a Supabase project. Enable Email and Password authentication under Authentication, then Providers.

3. In the Supabase SQL Editor, run the schema and seed files in order:

   ```
   supabase/migrations/0001_initial_schema.sql
   supabase/seed.sql
   ```

4. Copy the environment template and fill in your Supabase values:

   ```bash
   cp .env.local.example .env.local
   ```

   ```
   NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-public-key
   ```

5. Start the dev server:

   ```bash
   npm run dev
   ```

   Open http://localhost:3000.

### Rest timer notifications (optional)

The notification that fires when a rest ends while the app is closed is scheduled through
Upstash QStash. Everything else works without it; skip this and the rest timer still counts
down and still plays its sound, and the timer says so when it could not schedule an alert.

To enable it, add an Upstash QStash resource and set these on the deployed environment:

```
STORAGE_QSTASH_URL
STORAGE_QSTASH_TOKEN
STORAGE_QSTASH_CURRENT_SIGNING_KEY
STORAGE_QSTASH_NEXT_SIGNING_KEY
NEXT_PUBLIC_SITE_URL=https://your-deployment-url
```

The `STORAGE_` prefix is what the Vercel integration provisions, and the code passes these
explicitly rather than relying on the SDK's default `QSTASH_*` names. `NEXT_PUBLIC_SITE_URL`
is needed because the scheduler calls back to an absolute URL.

Scheduling only works on a deployed environment, not on localhost.

### Rate limiting (optional)

Sign in attempts and the rest callback are rate limited through Upstash Redis. Add an Upstash
Redis resource and set these on the deployed environment:

```
KV_REST_API_URL
KV_REST_API_TOKEN
```

These are the names the Vercel integration provisions, and they are the REST pair rather than
the TCP connection string. The code passes them explicitly instead of calling the SDK's
`fromEnv` helper. Without them the app runs with rate limiting disabled, which is the normal
state for local development.

## Tests

```bash
npm test
npm run test:coverage
```

As of 2026-08-07: 550 tests across 102 files, covering 70 percent of the application logic.

The data access layer (the server actions, the queries, the Supabase clients and the
IndexedDB adapter) is deliberately not unit tested, since exercising it meaningfully needs a
real database rather than a mock. Counting those 15 files, overall statement coverage is
53 percent.

The offline outbox is additionally checked with property based tests. Generated sequences
of logging, editing, deleting, swapping and finishing are run against a reference model of
the server through randomised network conditions, including a write that commits before the
connection drops and is therefore delivered twice, and asserted to leave the device and the
server holding the same data.

### End to end tests

```bash
npm run test:e2e
```

Playwright drives a real browser against a production build. It covers two things unit tests
cannot reach: the request layer, and the offline logging round trip.

The request layer guards check that every private route redirects a signed out visitor, that
the security headers the config declares actually arrive, that a per request nonce reaches
every script tag, that a nonexistent image path still goes through the proxy rather than
around it, and that the scheduler callback rejects an unsigned request instead of redirecting
it. These need no account.

The offline round trip logs sets with the network disabled, reloads to prove they survived,
reconnects, and then confirms from a second browser context with an empty local database that
the sets reached the server. It needs a real database and two dedicated accounts named by
`E2E_EMAIL_CHROMIUM` and `E2E_EMAIL_WEBKIT`. **Those accounts are wiped and reseeded on every
run**, so neither may be your own or the demo account. Node 20.12 or newer is required here,
above the 20.9 the app itself needs.

Only Chromium runs by default. The WebKit projects are configured and current, but Playwright's
prebuilt WebKit is linked against Ubuntu 24.04 system libraries and will not launch on newer
releases; on a supported OS, run `npx playwright test --project=webkit-public --project=webkit`.

These do not run in CI. They need a live database and a browser, and the seven checks on every
push stay fast and self contained.

## Performance and accessibility

Measured against the live deployment on the mobile preset, signed in as the demo account,
as the median of 9 runs:

| Route | Performance | Accessibility |
|---|---|---|
| Dashboard | 94 | 100 |
| Progress | 78 | 100 |
| Sign in | 88 | 100 |

**Accessibility returned 100 on all 27 runs with no variation**, and is the figure here to
rely on. Performance is dominated by main thread blocking time rather than load time, and
because that is CPU bound it varies by 14 to 16 points between runs on the same build, so
read it as approximate. Full numbers, every individual run, and the conditions they were
taken under are in [docs/lighthouse.md](docs/lighthouse.md).

Reproduce with `npm run lighthouse`. It requires no credentials.

## Installing on your iPhone

Onyx installs to the home screen and runs full screen like a native app:

1. Open the deployed URL in Safari.
2. Tap the Share button.
3. Tap Add to Home Screen.
4. Open Onyx from the home screen.

Notifications (such as the rest timer) require the app to be installed to the home screen first, on iOS 16.4 or newer.

## License

MIT
