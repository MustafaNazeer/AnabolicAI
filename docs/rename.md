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
into data that already exists on users' devices:

| Identifier | Consequence of renaming it |
| --- | --- |
| `DB_NAME` in `src/lib/offline/idb.ts` | Orphans every device's pending offline outbox |
| `onyx-theme` in `src/components/ThemeProvider.tsx` | Resets every saved accent |
| `onyx-mode` in `src/components/AppearanceProvider.tsx` | Resets every saved light or dark preference |
| The two keys read in `src/app/noFlashScript.ts` | Flashes the wrong theme on every load |
| `onyx-matrix-metric` in `src/components/useMatrixMetric.ts` | Resets the saved activity matrix metric |
| `onyx-progress-metric` in `src/components/useProgressMetric.ts` | Resets the saved progress chart metric |
| `onyx:` prefix in `src/lib/security/rateLimit.ts` | Resets rate limit counters. Harmless |
| `onyx-shell-v5` in `public/sw.js` | Safe, since this string is versioned deliberately |
| `PAGE_CACHE` in `src/lib/offline/warmSessionCache.ts` | The same cache name again. These two are the only definitions and must match |

Some things that only look internal were renamed, because a user sees them. The
exported CSV filename is the clearest case: it now begins `anabolicai-` rather
than `onyx-`. The custom CSS classes `onyx-lift` and `onyx-collapsible` were left
alone, because nobody sees a class name.

A string no user ever sees is not worth a data migration. `src/lib/offline/__tests__/dbName.test.ts`
fails loudly if the first one is ever changed.

## The historical record

`STATUS.md` and `STATUS-archive.md` were not rewritten. Every entry predating
2026-08-15 says Onyx because that is the name the work was done under.
