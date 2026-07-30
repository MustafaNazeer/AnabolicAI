# Onyx, Strength Progress Tracker

## Overview

Onyx is a dark, iPhone first strength progress tracker. It lets a small group of users build workout routines, log sets, reps, weight, and RIR quickly during a workout, time their rest between sets, and watch their strength trend over time through plain language charts. It is built as a Progressive Web App (PWA) deployed on Vercel, so it installs to the iPhone home screen for free and behaves like a native app: home screen icon, full screen mode, no browser chrome, and push notifications.

Onyx is a clean rebuild of an earlier prototype (SpotMe). The product idea is the same, but the execution priority is different: a tight, genuinely polished core rather than a broad, rough surface. Anything outside that core is explicitly deferred and documented.

## Target users

- A small private group of friends, up to about 10 users.
- Mixed lifting experience, from beginner to advanced.
- Primary device is the iPhone (all current models).
- Varying scientific literacy. The app must present data so anyone can understand it without knowing exercise science jargon.

## Design priorities

1. Polish first. Every screen that ships in v1 must feel finished: smooth, fast, consistent, no rough edges.
2. The in workout logging flow is the centerpiece. It is the screen users stare at mid set, so it gets the most design attention.
3. Plain language everywhere. Numbers and trends are explained in words, never in jargon or raw coefficients.
4. Tight scope. If a feature cannot be polished within v1, it is deferred to v2 and recorded in this document.

## Core features (v1)

### 1. Accounts and authentication

- Email and password authentication via Supabase Auth.
- Each user has isolated data, enforced by Row Level Security.
- Login persists across app reopens (no re login on every launch).
- No social features, no sharing, no public profiles.

### 2. Routines

- Create multiple named routines (for example "Push Day", "Leg Day").
- Each routine holds an ordered list of exercises.
- Add, remove, and reorder exercises within a routine.
- Rename and delete routines.
- No limit on the number of routines per user.

### 3. Exercise library

- A prepopulated library of common lifts (bench press, squat, deadlift, overhead press, barbell row, pull up, and similar).
- Users can add custom exercises with a name and an optional muscle group tag.
- Exercises are reusable across routines.
- Exercise names are searchable when adding to a routine.

### 4. Workout logging (centerpiece)

Each time a user performs a routine they create a workout session and log sets against it.

Logged per set: set number, reps, weight (lbs), and RIR (Reps In Reserve, 0 to 5). RIR is shown with plain language labels:

| RIR | Label |
|-----|-------|
| 0 | Nothing left |
| 1 | Maybe 1 more |
| 2 | Could do 2 more |
| 3 | Comfortable |
| 4 | Easy |
| 5 | Very easy |

- Users move through the routine's exercises in order, logging each set.
- The previous session's numbers are shown as reference, for example "Last time: 135 lbs x 8".
- Users can add extra sets beyond the routine default, and skip exercises.
- Swap for today: any exercise can be replaced with another for the current session only, for when a machine is occupied. The replacement takes the original's position and inherits its target set count, and the card names what it replaced. The routine itself is never modified, so the planned exercise returns next session. An exercise swapped out after it already had sets logged stays on screen as a read only card, and anything logged against an exercise no card shows is grouped under "Also logged this session", so work performed is never hidden.
- A workout left untouched for six hours is treated as abandoned. Opening it offers Resume, Finish, or Discard. Discarding deletes the session and its sets outright, so clearing an abandoned workout never counts as a completed one in the weekly summary, the streak, or the recap.
- Mid workout persistence: the in progress session is saved locally so closing, backgrounding, or reloading the app never loses the current workout. This is local resilience only, not full offline sync (see Deferred to v2).

### 5. Rest timer

- A configurable rest countdown the user can start between sets.
- Default duration is set in Settings and can be adjusted per use.
- When the app is in the foreground, completion plays a sound and a haptic.
- When the app is backgrounded or the phone is locked, completion fires a push notification (see Notifications). The exact mechanism for firing at the end time on iOS is a known design point to resolve during planning, since iOS PWAs do not have reliable local scheduled notifications and Web Push is server initiated.

### 6. Dashboard (home)

- Weekly summary: total workouts, total sets, and total volume this week.
- Streak counter: consecutive weeks with at least one workout.
- Recent workouts: the last few sessions with routine name, date, and quick stats.
- PR highlights: automatically detected personal records, stated plainly, for example "New best: Bench Press 185 lbs x 5".
- Activity matrix: a five week heatmap of daily activity whose metric the user chooses (Gym days, Volume, or personal records), defaulting to Gym days. The choice persists per device.

### 7. Progress

Per exercise, v1 ships the two charts that matter most:

- Weight over time: max weight per session with a trend line.
- Estimated 1RM trend: the estimated one rep max over time, labeled in plain language ("Estimated max you could lift once"). Estimation uses a standard formula (for example Epley).

Every chart includes a simple, color coded, plain language trend indicator computed from the last four sessions using simple linear regression:

- Improving (up)
- Holding steady
- Trending down

The user always sees words, never a coefficient.

### 8. Notifications

Delivered via a service worker and Web Push (VAPID). On iOS this requires the app to be added to the home screen first (iOS 16.4 or later). v1 ships these notifications:

1. Rest timer complete: "Rest's over, hit your next set."
2. Workout reminder: configurable in Settings (training days and a time), a scheduled nudge to train.
3. Streak protection: a warning before the weekly streak lapses.
4. PR celebration: instant congratulations the moment a personal record is logged.
5. Weekly recap: a Sunday summary, for example "This week: 4 workouts, 28k lbs moved".
6. Unfinished workout: a single reminder when a session has been left open with no activity for six hours, linking straight to it so it can be resumed, finished, or discarded.

All notifications are individually toggleable in Settings. The app works fully with notifications disabled.

### 9. Settings

- Theme picker: choose the accent color (see Theme system).
- Notification preferences: master toggle, per notification toggles, workout reminder schedule, default rest timer duration.
- Sign out.

### 10. PWA install

The app must install to the iPhone home screen for free and behave like a native app:

- Web app manifest with name, icons (192 and 512), theme color, and standalone display.
- Service worker for the app shell and for push.
- Apple meta tags for full screen home screen launch.
- Apple touch icons and splash screens for current iPhone sizes.
- Safe area insets respected (notch, home indicator).
- No horizontal scroll, no pinch zoom issues.
- Touch targets at least 44 by 44 points.
- App shell loads instantly from the home screen.

## Theme system

- The app is dark only in v1. Light mode is deferred (see Deferred to v2).
- The accent color is themeable through design tokens. The default is Cobalt.
- v1 ships five selectable accents: Cobalt (default), Magenta, Emerald, Crimson, Rose.
- Switching theme changes both the accent and the dark base. Each theme is an accent paired with a matching tinted base gradient. The default theme is Cobalt.

## Data model

Tables (all user scoped tables enforce Row Level Security so a user can only read and write their own rows):

```
users (managed by Supabase Auth)
  id, email, created_at

user_settings
  user_id (FK, PK)
  theme              text   (default 'cobalt')
  rest_timer_seconds integer (default 120)
  notif_master       boolean
  notif_rest_timer   boolean
  notif_reminder     boolean
  reminder_days      text   (which days)
  reminder_time      time
  notif_streak       boolean
  notif_pr           boolean
  notif_weekly       boolean
  notif_unfinished   boolean

routines
  id, user_id (FK), name, created_at, updated_at

exercises
  id, user_id (FK), name, muscle_group (nullable), is_default (boolean)

routine_exercises
  id, routine_id (FK), exercise_id (FK), order_index, default_sets (default 3)

workout_sessions
  id, user_id (FK), routine_id (FK), started_at, completed_at (nullable),
  unfinished_notified (boolean, default false)

session_exercise_swaps
  id, session_id (FK), original_exercise_id (FK), replacement_exercise_id (FK),
  created_at
  one row per swapped slot per session (unique on session_id +
  original_exercise_id); deleting the row undoes the swap

workout_sets
  id, session_id (FK), exercise_id (FK), set_number, reps, weight, rir (0 to 5), logged_at

push_subscriptions
  id, user_id (FK), endpoint, keys, created_at
```

Derived values (estimated 1RM, volume, PR detection, trend direction) are computed from `workout_sets`, not stored.

## Tech stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Frontend | Next.js (latest, App Router) + TypeScript | PWA support, Vercel native, strong typing |
| Styling | Tailwind CSS | Fast, mobile first, token friendly theming |
| Charts | Recharts | Lightweight, responsive, React native |
| Backend and DB | Supabase (Postgres + Auth + RLS) | Free tier covers the user base, RLS for isolation |
| Auth | Supabase Auth (email and password) | Simple, no email delivery dependency |
| Notifications | Service worker + Web Push (VAPID) | Free push on installed iOS PWAs |
| Hosting | Vercel | Free, global CDN, zero config deploys |
| Icons | Lucide React | Clean icon set, no emojis |
| Typography | Spectral (serif) for display headings and hero numbers, Geist for body | Contrast between expressive display face and clean body type |

## UI and UX guidelines

- Dark only, with the approved iPhone dashboard structure (greeting, stat tiles, trend panel, PR callout, bottom tab navigation).
- No emojis anywhere in the UI. Use icons.
- Bottom tab navigation (for example Home, Routines, Log, Progress, Settings).
- Large, tappable controls designed for one handed use.
- Numbers and stats in large, bold type.
- Charts are interactive (tap a point for detail).
- Skeleton loaders for async states, not spinners.
- Friendly, actionable error states ("Couldn't save. Tap to retry.").
- Readable without zooming on any current iPhone size.

## Deferred to v2

These are deliberately excluded from v1 but are real planned next steps. They define the v1 scope boundary.

- Goals feature: set per lift targets, track progress toward them, and the goal proximity notification ("You're 5 lbs from your bench goal"). This is the first planned v2 feature.
- Offline sync: full workout logging with no connection, with background sync on reconnect (IndexedDB). Note that mid workout local persistence is in v1; full offline sync is not.
- Light mode (the theme picker stays accent only in v1).
- Secondary charts: volume over time, rep progression, per routine stacked volume.
- Routine duplicate.
- Quick fill: one tap copy of last session's weight and reps.

Speculative ideas that are not yet planned live in `future-ideas.md` (private, gitignored).

## Configuration

### Environment variables

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
VAPID_PUBLIC_KEY
VAPID_PRIVATE_KEY
```

### Supabase setup

- Create a free project.
- Enable email and password auth.
- Run the schema migration (tables, indexes, RLS policies).
- Seed the default exercise library.

## Project structure

Onyx is a single Next.js application. Routes and shared logic live under `src/`, the database schema under `supabase/`, and the installable app shell under `public/`.

```
src/app/          App Router routes, layouts, and the PWA entry points
src/components/   Screen components, with shared primitives under ui/
src/lib/          Domain logic by concern: data access and server actions,
                  Supabase clients, workout logging, progress math,
                  notifications, offline queueing, brand assets
supabase/         SQL migrations and the exercise library seed
public/           Service worker, manifest, icons, splash images
scripts/          Build time asset generation
middleware.ts     Session refresh on every request
```

Derived values (estimated one rep max, volume, personal record detection, trend direction) are computed by pure modules under `src/lib/`, so they can be unit tested without a database or a browser. Tests live in `__tests__` folders beside the code they cover and run under Vitest with `npm test`.

## Non goals (v1)

- No social features, sharing, or public profiles.
- No light mode.
- No full offline sync.
- No goals feature (deferred to v2).
- No Android specific or desktop specific design work; iPhone is the target.
