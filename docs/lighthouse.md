# Lighthouse

Measured against the live production deployment, signed in as the demo account, so the
numbers describe the app a visitor actually reaches rather than a login form.

Reproduce with `npm run lighthouse`. It needs no credentials: the harness clicks the
**Try the demo** button, and the demo password stays server side.

## Scores

| Route | Performance | Accessibility | Best practices | SEO |
|---|---|---|---|---|
| `/` (dashboard) | 93 | 100 | 100 | 100 |
| `/progress` | 76 | 100 | 100 | 100 |
| `/sign-in` | 87 | 100 | 100 | 100 |

Each figure is the median of 9 runs. Measured 2026-08-02 against commit `645026f` with
Lighthouse 13.4.1 on the mobile preset, which applies 4x CPU throttling and a slow 4G
network. Best practices and SEO were 100 on every run.

## Performance is noisy, and the spread says so

The performance score moved a lot between runs. The nine dashboard runs came back 81, 87,
88, 88, 93, 93, 95, 97, 100.

| Route | Performance spread across 9 runs |
|---|---|
| `/` | 19 points |
| `/sign-in` | 13 points |
| `/progress` | 11 points |

Raising the run count from 5 to 9 made the spread wider, not narrower, so this is not
sampling error that more runs would settle. Total blocking time is CPU bound, and the
measuring machine is not idle. **Read the performance column as approximate.** The
accessibility column, by contrast, returned 100 on all 27 runs with zero spread.

## What is actually costing the points

One audit fails, on every route, and nothing else does.

| Route | Total blocking time | Range | Largest contentful paint |
|---|---|---|---|
| `/progress` | 1176ms | 582 to 1449 | 1063ms |
| `/sign-in` | 503ms | 222 to 708 | 1061ms |
| `/` | 326ms | 36 to 778 | 1083ms |

Lighthouse treats blocking time at or under 200ms as good and over 600ms as poor.

Largest contentful paint sits near 1.07 seconds everywhere, well inside the 2.5 second
threshold, so the app loads quickly and the deficit is main thread work after load.

`/sign-in` is the useful case here. It is an email field, a password field and two buttons,
and it blocks for longer than the dashboard that renders a heatmap, stat tiles and a
personal record list. A form has no content that could account for that, so the cost is
framework JavaScript and hydration shared by every route, with `/progress` adding its charts
on top.

## What these numbers do not say

The accessibility score is automated only, exactly like the axe tests in this repo. It
cannot detect the WCAG 2.5.3 Label in Name criterion, among others, because comparing a
visible label against an accessible name is not automatable. Treat it as evidence toward
WCAG AA, not as proof of it.

The numbers reflect the demo account's seeded data: three routines and eight weeks of
sessions. An account with more history renders more and would score differently.

Performance is measured over the public internet against a live deployment, so CDN
behaviour and network conditions move it, which is why the spread is published beside the
median rather than the median alone.

Chrome runs with `--no-sandbox`. Ubuntu 23.10 and newer restrict unprivileged user
namespaces through AppArmor, so Chrome cannot start its own sandbox and will not launch
without the flag. It is recorded here because it is a condition of how these numbers were
produced.

The logging screen, `/log/[sessionId]`, is not measured. Every seeded demo session is
already completed, so there is no active workout to open, and creating one would write to
the live demo account on every run.
