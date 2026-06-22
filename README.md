# Onyx

A dark, iPhone first strength progress tracker, built as an installable Progressive Web App. Create workout routines, log your sets, reps, weight, and reps in reserve during a session, time your rest between sets, and watch your strength trend over time in plain language.

Onyx is a private app for a small group of users. Each person has their own account and their own isolated data, enforced at the database level.

## Tech stack

- Next.js (App Router) and TypeScript
- Tailwind CSS
- Supabase (Postgres, Auth, Row Level Security)
- Recharts for progress charts
- Web Push (VAPID) for notifications
- Vercel for hosting

## Prerequisites

- Node.js 18 or newer
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

## Tests

```bash
npm test
```

## Installing on your iPhone

Onyx installs to the home screen and runs full screen like a native app:

1. Open the deployed URL in Safari.
2. Tap the Share button.
3. Tap Add to Home Screen.
4. Open Onyx from the home screen.

Notifications (such as the rest timer) require the app to be installed to the home screen first, on iOS 16.4 or newer.

## License

MIT
