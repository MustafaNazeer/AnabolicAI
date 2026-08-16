# The rename

This project was built and shipped as **Onyx** from 2026-06-21 to 2026-08-15, and
renamed to **AnabolicAI** on 2026-08-15.

## Why

The old name collided twice. `onyx-dot-app/onyx` is a large, unrelated open source
AI platform, and `Onyx Coach` is a workout tracker on the App Store occupying this
app's exact category. A project that wants to be found cannot carry a name that
returns someone else's product.

## Why the code still says Onyx in places

Nine internal identifiers deliberately keep the old string, because they are keys
into state that already exists, on users' devices in eight cases and in this
app's own server side rate limiting on Upstash in the ninth:

| Identifier | Consequence of renaming it |
| --- | --- |
| `DB_NAME` in `src/lib/offline/idb.ts` | Orphans every device's pending offline outbox |
| `onyx-theme` in `src/components/ThemeProvider.tsx` | Resets every saved accent |
| `onyx-mode` in `src/components/AppearanceProvider.tsx` | Resets every saved light or dark preference |
| The two keys read in `src/app/noFlashScript.ts` | Flashes the wrong theme on every load |
| `onyx-matrix-metric` in `src/components/useMatrixMetric.ts` | Resets the saved activity matrix metric |
| `onyx-progress-metric` in `src/components/useProgressMetric.ts` | Resets the saved progress chart metric |
| `onyx:` prefix in `src/lib/security/rateLimit.ts` | Resets rate limit counters. Harmless |
| `onyx-shell-v5` in `public/sw.js` and `PAGE_CACHE` in `src/lib/offline/warmSessionCache.ts` | The same cache name, defined in two places because `sw.js` cannot import from `src/`. The version number is safe to bump, but both definitions must move together, or `serviceWorker.test.ts` fails |

Some things that only look internal were renamed, because a user sees them. The
exported CSV filename is the clearest case: it now begins `anabolicai-` rather
than `onyx-`. The custom CSS classes `onyx-lift` and `onyx-collapsible` were left
alone, because nobody sees a class name.

A string no user ever sees is not worth a data migration. `src/lib/offline/__tests__/dbName.test.ts`
fails loudly if the first one is ever changed.

## Other places the string remains, and why

A grep for `onyx` in the source turns up more than the nine identifiers above.
None of these carry state, so none had to move, but each is listed here so the
grep lands on an explanation rather than a dead end.

- `src/lib/offline/sync.ts`, the `console.warn("onyx: dropping unsyncable op", ...)`
  prefix. A debug label, not a user facing or stored string.
- `src/lib/brand/mark.ts`, the header comment and the `onyxLit` and `onyxMid`
  gradient ids. This one matters most: the mark is literally a drawing of an
  onyx gemstone, and it is being redesigned on a separate follow up branch,
  which is why it was left for that work rather than half updated here.
- `scripts/lighthouse/targets.mts` and `scripts/lighthouse/run.mts`, the
  `ONYX_BASE_URL` and `ONYX_SHARE_TOKEN` contributor environment variables,
  which `docs/lighthouse.md` documents publicly. Renaming them would break a
  documented contributor contract for no benefit.
- `package.json` and `package-lock.json`, `"name": "onyx"`. The package is
  private and never published, so nothing external ever resolves this name.
- `supabase/migrations/*.sql` and `supabase/seed.sql`, header comments in
  already applied migrations. A migration is a historical record of what ran,
  not a place to keep current, so applied migrations are not edited as a
  habit.
- `src/lib/__tests__/deployment.test.ts` and
  `src/components/__tests__/HostWarning.test.tsx`, which keep the old
  hostname as a test fixture. These tests prove the host comparison logic
  works for some canonical host, not that the current one holds a particular
  value, so the fixture does not need to track the live host.

## The historical record

`STATUS.md` and `STATUS-archive.md` were not rewritten. Every entry predating
2026-08-15 says Onyx because that is the name the work was done under.
