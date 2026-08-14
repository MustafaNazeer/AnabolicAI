# Onyx, a case study

Onyx is a strength progress tracker: an installable web app for iPhone where a small group
of us build routines, log sets during a workout, and watch our lifts trend over time. This
is an account of how it was built, and specifically of the hardest thing in it, which was
making the logging screen work with no connection.

## The problem

Onyx is a rebuild of an earlier prototype of mine. That prototype was broad and rough: a
lot of features, none of them finished. I inverted the priority for the rebuild. The core
would be small and genuinely polished, and anything outside it would be deferred on
purpose and written down rather than half built.

That constraint shaped everything after it. The in workout logging screen is the
centerpiece, because it is the one screen you actually stare at between sets with a bar in
your hands, so it got the most design attention. Anything that could not be finished well
was cut and recorded rather than shipped rough. The specification still reads that way: a
short list of what v1 is, and beside it an explicit list of what it is not.

## The architecture

Next.js with the App Router and TypeScript, Supabase Postgres for data and authentication,
and an installable progressive web app with a service worker and Web Push. Charts are drawn
with Recharts, and it deploys on Vercel. None of that is exotic, and that was the point.

The one decision worth stating rather than listing is where isolation lives. Every user
scoped table enforces row level security in the database, with per operation policies on
`auth.uid() = user_id`. Application code does not decide who sees what. The database
refuses.

I tested that rather than assuming it. Signed in as the seeded demo account, I requested
another account's routine and workout session directly by id. Both returned 404, the same
path the database takes for "this does not exist" and for "this is not yours".

The suite runs 850 tests across 136 files, covering 77 percent of the application logic. The
data access layer, 19 files of server actions, queries and clients, is left to integration
testing rather than mocked, which is why overall coverage reads 62 percent. Every push to
main type checks, lints, runs the suite, builds, audits the dependency tree at high
severity, scans the pushed commits for secrets, and runs static analysis.

## The hardest problem, logging with no signal

The gym has no signal. The logging screen is the centerpiece, so it had to keep working
without a connection, and that turned out to be the hardest problem in the project.

The platform decided the shape of the answer. iOS has no Service Worker Background Sync
API, so there was never an option to hand a queue to the browser and let it drain while
the app is closed. Whatever I built had to run in the foreground. The sync engine
therefore drains on mount, on the `online` event, on `visibilitychange`, and after each
successful online mutation, which is every moment the app is awake and might have a
connection.

The logging screen became local first. It renders from an IndexedDB store seeded from the
server snapshot rather than from a round trip, mutations apply optimistically, and each
one is appended to an IndexedDB outbox. A single flight engine drains that outbox through
the same server actions the online path already used. No schema change, no migration, no
new runtime dependency.

Replay safety came from moving id generation to the client. Set ids are created with
`crypto.randomUUID` on the device, and the insert upserts on that id, so an operation
replayed after an ambiguous failure cannot write the same set twice. It also means the
personal record check fires only for a genuinely new set, because a replayed upsert
returns no row.

What went wrong is the part worth reading. I reviewed the whole branch adversarially
before it shipped, and that review found four data integrity bugs. Two of them mattered.

The first was silent data loss. The insert returned an error object for any failure at
all, including expired authentication, a policy rejection and a transient 500, and the
drain treated every error as invalid input and discarded the operation. A momentary server
error would have thrown away a set the user had logged and watched appear on screen. The
fix was to classify the failures: only client side input validation can never succeed, so
only that is dropped, and everything else halts the queue and retries.

The second was a row coming back from the dead. Deleting a set whose insert was still in
flight cancelled the queued insert, but the insert had already landed on the server, so
the set reappeared on the next reload. The fix enqueues a compensating delete, which is a
harmless no op if the insert never left the device and the cleanup if it did.

The other two were operations stranded by a drain that read the outbox once and never
looped again, and finish errors dropped by the same misclassification as the first.

All four were caught by review before they reached anyone's data, which is why they are
worth telling.

## What I learned, measure and then check the measurement

I published a Lighthouse performance score for this app. Then I measured again more
carefully and found that identical application code returned 729ms of blocking time on one
deployment and 1369ms on another a few minutes later. Nothing about the app had changed.
The metric is CPU bound, and the machine doing the measuring had been loaded by the
measurement runs themselves.

So I republished it. [docs/lighthouse.md](lighthouse.md) now carries every individual run,
the spread across them, and the conditions they were taken under. I also dropped my target
of 95 rather than chase it, because the blocking cost is React hydration, so reaching it
would have meant restructuring the entire client tree for a number that swings 14 to 16
points between runs on the same build.

The lesson is short: a number published with its own error bars is worth more than a round
number published without them.

Accessibility is the counter example and the claim I stand behind. It returned 100 on all
27 runs, on every route, with no variation at all, because it does not depend on timing.
