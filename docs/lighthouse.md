# Lighthouse

Measured against the live production deployment. The two routes that render real data are
measured signed in as the demo account, so they describe the app a visitor actually reaches;
the sign in page is measured signed out, because that is the only state a visitor ever sees
it in.

Reproduce with `npm run lighthouse`. It needs no credentials: the harness clicks the
**Try the demo** button, and the demo password stays server side. Set `ONYX_BASE_URL` to
measure a Vercel preview instead, and `ONYX_SHARE_TOKEN` if that preview is behind
deployment protection. A share token is invalidated the moment a newer one is minted for the
project, so two deployments are compared one token at a time rather than both up front.

## Scores

| Route | Performance | Accessibility | Best practices | SEO |
|---|---|---|---|---|
| `/` (dashboard) | 86 | 100 | 100 | 100 |
| `/progress` | 79 | 100 | 100 | 100 |
| `/sign-in` | 93 | 100 | 100 | 91 |

Median of 9 runs, measured 2026-08-14 against commit `e7a2ad3` with Lighthouse 13.4.1 on
the mobile preset, which applies 4x CPU throttling and a slow 4G network.

Lighthouse reports a fifth category, agentic browsing, which this table has never carried. It
returned 100 on the dashboard and on progress, and 67 on the sign in page.

**The sign in row describes a different page than it used to.** Until 2026-08-14 the harness
signed in first and measured every route afterwards, and the proxy redirects a signed in
visitor off `/sign-in` to the dashboard. So that row was the dashboard reached through a
redirect, carrying a redirect penalty no signed out visitor ever pays. Its scores here are
the first that describe the sign in page itself, and its SEO of 91 is a real property of that
page rather than a regression. The dashboard and progress rows moved for the ordinary reasons:
run to run variation, and two weeks of features landing between the two commits. **Neither is
attributable to any single change.**

## Read the performance column as approximate

Every one of the nine runs, per route:

| Route | Performance across 9 runs |
|---|---|
| `/` | 82, 83, 85, 86, **86**, 87, 87, 89, 92 |
| `/progress` | 76, 77, 78, 78, **79**, 82, 83, 84, 89 |
| `/sign-in` | 86, 88, 93, 93, **93**, 96, 97, 99, 99 |

**Accessibility, by contrast, returned 100 on all 27 runs with zero variation.** It is not
timing dependent, so it is the number here that can be relied on.

Performance is dominated by total blocking time, which is CPU bound, so it moves with
whatever else the measuring machine is doing. These figures were taken with the machine
deliberately idle. On 2026-08-02 a run of **one single commit** on a loaded machine returned
75, 73 and 88 across the three routes while an idle run of that same commit returned 94, 78
and 88, which is the honest measure of how much the method rather than the app moves the
number. Raising the run count from 5 to 9 widened the spread
rather than narrowing it, so this is not sampling error that more runs would settle.

If you want one sentence: **the sign in page sits in the low 90s, the dashboard in the mid
80s, and the progress screen in the high 70s.**

## What is actually costing the points

Total blocking time is the only audit that fails on the two authenticated routes. The sign in
page fails two more, `robots-txt` and `llms-txt`, each at weight 1, and those two are the whole
of its SEO score of 91. Both fail for the same mundane reason: the app serves neither file.
They score only on this route; on the other two Lighthouse marks them not applicable and they
are left out of the score entirely. Why it does that has not been chased down.

| Route | Total blocking time | Range | Largest contentful paint |
|---|---|---|---|
| `/progress` | 951ms | 437 to 1165 | 972ms |
| `/` | 542ms | 349 to 762 | 979ms |
| `/sign-in` | 307ms | 101 to 468 | 1069ms |

Lighthouse treats blocking time at or under 200ms as good and over 600ms as poor.

Largest contentful paint sits near one second everywhere, well inside the 2.5 second
threshold, so the app loads quickly and the deficit is main thread work after load.

`/sign-in` is still the useful case, for the opposite reason it used to be. It is an email
field, a password field and four buttons, and it blocks for 307ms: less than the dashboard,
as a page with almost nothing on it should. **An earlier version of this document said the
sign in page blocked for longer than the dashboard and reasoned from there that the cost was
framework JavaScript shared by every route. That reading was an artifact of measuring a
redirect into the dashboard under the sign in label, and it is withdrawn.** What survives it
is the plainer point: 307ms of blocking on a page holding one form is still framework cost
rather than page content, since there is no content there to account for it.

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

## The per request auth round trip was removed

Every request used to ask Supabase who the user was. `getUser()` sends the access token to the
auth server and waits, and the proxy runs on nearly every route, so one page load paid that
round trip in the proxy and again in the page it rendered. `getClaims()` verifies the same
token locally against the project's ES256 key set instead, cached in a process global for ten
minutes.

Measured as a controlled comparison: two preview deployments built from `96f4c93` and
`e7a2ad3`, which differ only by that branch, each warmed and then measured back to back on the
same machine and network.

**Server response time is the number that moves**, and it is the reason this document now
tracks it. It is time to first byte of the main document, read from the observed trace rather
than from the simulation, so it reports the server rather than the CPU throttling the mobile
preset applies. Median of 9 runs:

| Route | Before | After |
|---|---|---|
| `/` | 172ms | 123ms |
| `/progress` | 149ms | 130ms |
| `/sign-in`, signed out | 109ms | 131ms |

**The sign in row is a control, and it is why the other two can be believed.** Signed out there
is no session, and auth-js answers without a network call in either build, so that row carries
no identity round trip on either side and should not move at all. It moved by 22ms. That is
the honest size of the drift between two measurement sessions twenty minutes apart, and it
means the raw deltas above understate the change rather than flatter it.

Reading each route against the control taken in its own session removes that drift. A second
method, forty plain requests per path alternating between an authenticated route and the
signed out control inside a single session, all answering 200, is shown beside it:

| Route and method | Before, above control | After, above control |
|---|---|---|
| `/`, Lighthouse | +63ms | −8ms |
| `/`, sampler, two runs | +51ms, +34ms | +9ms, +15ms |
| `/`, live production | not applicable | +28ms |
| `/progress`, Lighthouse | +40ms | −1ms |
| `/progress`, sampler | +33ms | +6ms |
| `/progress`, live production | not applicable | +4ms |

**The honest summary: across every method the before build sits between +33ms and +63ms above
its own baseline, and the after build between −8ms and +28ms, and the two bands do not
overlap.** Calling it "roughly 40ms off the critical path of every authenticated request" is
supportable. Quoting a single figure to the millisecond is not, and the spread is why: the same
sampler on the same two builds returned +51ms and then +34ms for the dashboard within minutes.

**Two limits, stated rather than buried.** The win applies to a warm process. A cold start pays
one key set fetch regardless, and so does the first request after the ten minute cache lapses,
so a deployment that has just gone live sees none of this. And the before build cannot be
measured on production, because production has long since moved past it, which is why the
controlled pair are both previews and production appears only as a check that it lands in the
same band.

## What these numbers do not say

The accessibility score is automated only, exactly like the axe tests in this repo. It
cannot detect the WCAG 2.5.3 Label in Name criterion, among others, because comparing a
visible label against an accessible name is not automatable. Treat it as evidence toward
WCAG AA, not as proof of it.

The numbers reflect the demo account's seeded data: three routines and eight weeks of
sessions. An account with more history renders more and would score differently.

Runs reuse the browser session, which also preserves the HTTP cache, so these are warm
cache measurements. That barely affects blocking time, since scripts parse and execute
either way, but the load metrics are optimistic against a first visit. The one exception is
the first run of the first route measured, which is `/sign-in` now that the signed out routes
go first, and which therefore starts with an empty cache.

Chrome runs with `--no-sandbox`. Ubuntu 23.10 and newer restrict unprivileged user
namespaces through AppArmor, so Chrome cannot start its own sandbox and will not launch
without the flag.

The logging screen, `/log/[sessionId]`, is not measured. Every seeded demo session is
already completed, so there is no active workout to open, and creating one would write to
the live demo account on every run.
