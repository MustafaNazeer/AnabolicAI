# Lighthouse

Measured against the live production deployment, signed in as the demo account, so the
numbers describe the app a visitor actually reaches rather than a login form.

Reproduce with `npm run lighthouse`. It needs no credentials: the harness clicks the
**Try the demo** button, and the demo password stays server side. Set `ONYX_BASE_URL` to
measure a Vercel preview instead, and `ONYX_SHARE_TOKEN` if that preview is behind
deployment protection.

## Scores

| Route | Performance | Accessibility | Best practices | SEO |
|---|---|---|---|---|
| `/` (dashboard) | 94 | 100 | 100 | 100 |
| `/progress` | 78 | 100 | 100 | 100 |
| `/sign-in` | 88 | 100 | 100 | 100 |

Median of 9 runs, measured 2026-08-02 against commit `67e9f6a` with Lighthouse 13.4.1 on
the mobile preset, which applies 4x CPU throttling and a slow 4G network.

## Read the performance column as approximate

Every one of the nine runs, per route:

| Route | Performance across 9 runs |
|---|---|
| `/` | 83, 88, 88, 89, **94**, 94, 95, 95, 97 |
| `/progress` | 71, 76, 76, 76, **78**, 79, 83, 84, 85 |
| `/sign-in` | 78, 82, 82, 83, **88**, 89, 89, 94, 94 |

**Accessibility, by contrast, returned 100 on all 27 runs with zero variation.** It is not
timing dependent, so it is the number here that can be relied on.

Performance is dominated by total blocking time, which is CPU bound, so it moves with
whatever else the measuring machine is doing. These figures were taken with the machine
deliberately idle. An earlier run of the **same commit** on a loaded machine returned 75,
73 and 88 for the same three routes, which is the honest measure of how much the method
rather than the app moves the number. Raising the run count from 5 to 9 widened the spread
rather than narrowing it, so this is not sampling error that more runs would settle.

If you want one sentence: **the dashboard and sign in sit in the high 80s to mid 90s, and
the progress screen in the high 70s.**

## What is actually costing the points

One audit fails, on every route, and nothing else does.

| Route | Total blocking time | Range | Largest contentful paint |
|---|---|---|---|
| `/progress` | 987ms | 582 to 2235 | 1078ms |
| `/sign-in` | 476ms | 284 to 1055 | 1071ms |
| `/` | 291ms | 190 to 686 | 1067ms |

Lighthouse treats blocking time at or under 200ms as good and over 600ms as poor.

Largest contentful paint sits near 1.07 seconds everywhere, well inside the 2.5 second
threshold, so the app loads quickly and the deficit is main thread work after load.

`/sign-in` is the useful case. It is an email field, a password field and two buttons, and
it blocks for longer than the dashboard that renders a heatmap, stat tiles and a personal
record list. A form has no content that could account for that, so the cost is framework
JavaScript and hydration shared by every route rather than anything on the page.

## The chart library was moved off the critical path

`/progress` loads Recharts, 99 KB gzipped, which no other route needs. It is now loaded
through a dynamic import after hydration, with a skeleton holding its place, so it no
longer blocks the page becoming interactive.

Measured as a controlled comparison, a preview build against production back to back so
both saw the same machine and network, blocking time on `/progress` fell from 1691ms to
729ms. Measured across separate sessions the same change reads smaller, 1176ms against
987ms. **The improvement is real and the back to back pair is the more trustworthy of the
two, but the honest range for its size is wide.**

Worth stating plainly: total script evaluation on `/progress` did not fall. The work moved
to after the page becomes interactive rather than disappearing, which is what blocking time
measures and why the score moved.

## What these numbers do not say

The accessibility score is automated only, exactly like the axe tests in this repo. It
cannot detect the WCAG 2.5.3 Label in Name criterion, among others, because comparing a
visible label against an accessible name is not automatable. Treat it as evidence toward
WCAG AA, not as proof of it.

The numbers reflect the demo account's seeded data: three routines and eight weeks of
sessions. An account with more history renders more and would score differently.

Runs reuse the browser session, which also preserves the HTTP cache, so these are warm
cache measurements. That barely affects blocking time, since scripts parse and execute
either way, but the load metrics are optimistic against a first visit.

Chrome runs with `--no-sandbox`. Ubuntu 23.10 and newer restrict unprivileged user
namespaces through AppArmor, so Chrome cannot start its own sandbox and will not launch
without the flag.

The logging screen, `/log/[sessionId]`, is not measured. Every seeded demo session is
already completed, so there is no active workout to open, and creating one would write to
the live demo account on every run.
