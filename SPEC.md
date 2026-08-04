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

Logged per set: set number, reps, weight (lbs), and RIR (Reps In Reserve).

RIR is typed rather than picked, and it is optional. It takes a whole number from 0 to 5, or a range such as 0 to 1 for a set that sat honestly between the two, entered as a value plus an optional second box. Leaving it blank records no RIR at all rather than assuming one. Each logged set reads its RIR back, for example "Set 1: 8 for 135 lbs, 0-1 RIR".

- Users move through the routine's exercises in order, logging each set.
- The previous session's numbers are shown as reference, for example "Last time: 135 lbs x 8".
- Users can add extra sets beyond the routine default, and skip exercises.
- Swap for today: any exercise can be replaced with another for the current session only, for when a machine is occupied. The replacement takes the original's position and inherits its target set count, and the card names what it replaced. The routine itself is never modified, so the planned exercise returns next session. An exercise swapped out after it already had sets logged stays on screen as a read only card, and anything logged against an exercise no card shows is grouped under "Also logged this session", so work performed is never hidden.
- A workout left untouched for six hours is treated as abandoned. Opening it offers Resume, Finish, or Discard. Discarding deletes the session and its sets outright, so clearing an abandoned workout never counts as a completed one in the weekly summary, the streak, or the recap.
- Mid workout persistence: the in progress session is saved locally so closing, backgrounding, or reloading the app never loses the current workout. This is local resilience only, not full offline sync (see Deferred to v2).

### 5. Rest timer

- A configurable rest countdown the user can start between sets.
- Default duration is set in Settings. During a workout it can be changed to any value by tapping the countdown and typing the minutes and seconds, and that choice becomes the duration for the rest of the session and is saved back as the new default.
- Completion plays a sound while the app is open. This is controlled by the "Sound" setting in Settings, which is independent of the push notification toggles.
- There is no haptic. iOS Safari does not implement the Vibration API, so a web app cannot produce one on the target device.
- The countdown is driven by the end time rather than by counting seconds, so backgrounding the app does not make it lose time.
- Completion also fires a push notification when the app is closed or the phone is locked, so a rest taken with the phone in a pocket still ends with a nudge. It is suppressed while the app is open, since the sound has already played. Scheduling it needs a connection at the moment the rest starts; without one the timer says so and only the local sound applies.

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

1. Workout reminder: configurable in Settings (training days and a time), a scheduled nudge to train.
2. Streak protection: a warning before the weekly streak lapses.
3. PR celebration: instant congratulations the moment a personal record is logged.
4. Weekly recap: a Sunday summary, for example "This week: 4 workouts, 28k lbs moved".
5. Unfinished workout: a single reminder when a session has been left open with no activity for six hours, linking straight to it so it can be resumed, finished, or discarded.
6. Rest timer complete: a nudge when a rest ends while the app is closed or the phone is locked.

All notifications are individually toggleable in Settings. The app works fully with notifications disabled.

### 9. Settings

- Theme picker: choose the accent color (see Theme system).
- Notification preferences: master toggle, per notification toggles, workout reminder schedule.
- Rest timer: default duration, whether completion plays a sound, and whether it sends a notification when the app is closed. The default duration is also updated whenever it is changed during a workout.
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
  notif_rest_push    boolean
  notif_reminder     boolean
  reminder_days      text   (which days)
  reminder_time      time
  notif_streak       boolean
  notif_pr           boolean
  notif_weekly       boolean
  notif_goal         boolean
  notif_unfinished   boolean

routines
  id, user_id (FK), name, created_at, updated_at

exercises
  id, user_id (FK), name, muscle_group (nullable), is_default (boolean)

routine_exercises
  id, routine_id (FK), exercise_id (FK), order_index, default_sets (default 3)

workout_sessions
  id, user_id (FK), routine_id (FK), started_at, completed_at (nullable),
  unfinished_notified (boolean, default false),
  rest_ends_at (nullable), rest_token (nullable)
  the live rest for this session; a fresh token per start is what lets a
  scheduled notification tell whether it is still wanted on arrival

goals
  id, user_id (FK), exercise_id (FK), target_weight, target_reps,
  status ('active' or 'achieved'), proximity_notified (boolean),
  created_at, achieved_at (nullable)
  at most one active goal per user and exercise; achieved rows are
  unconstrained history

session_exercise_swaps
  id, session_id (FK), original_exercise_id (FK), replacement_exercise_id (FK),
  created_at
  one row per swapped slot per session (unique on session_id +
  original_exercise_id); deleting the row undoes the swap

workout_sets
  id, session_id (FK), exercise_id (FK), set_number, reps, weight,
  rir_low (nullable, 0 to 5), rir_high (nullable, 0 to 5), logged_at
  both ends are set together or both are null; a single value stores the
  same number in each

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

These were deliberately excluded from v1. The list is kept as the record of where the v1 scope boundary sat, not as a task list. Every item below has since been built and shipped in v2, along with the mid workout exercise swap and the ability to discard an abandoned workout.

- Goals feature: set per lift targets, track progress toward them, and the goal proximity notification ("You're 5 lbs from your bench goal"). This is the first planned v2 feature.
- Offline sync: full workout logging with no connection, with background sync on reconnect (IndexedDB). Note that mid workout local persistence is in v1; full offline sync is not.
- Light mode (the theme picker stays accent only in v1).
- Secondary charts: volume over time, rep progression, per routine stacked volume.
- Routine duplicate.
- Quick fill: one tap copy of last session's reps, weight and reps in reserve.
- Additional notifications: unfinished workout reminder.

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
