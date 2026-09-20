# Daily Puzzle

- **slug**: `daily-puzzle`
- **cluster**: education
- **type**: full-stack
- **layout**: dashboard

Wordle-like daily word puzzle with streaks, per-day stats, emoji share cards, and a global stats leaderboard

> **This is a complete, working app, already built.** The data model, handlers, and screens below all exist on disk (paths shown). Treat this as the user's existing codebase: **adapt the listed files in place** for the request; do not recreate tables, handlers, or pages that already exist, and do not add packages for functionality already implemented here.

## Features

`auth`, `stats`, `leaderboard`, `subscriptions`

## Data model (7 domain tables)

_Already created by the existing SQL in `api/migrations/` — do NOT add new migrations for these tables._

- **devices** — id, createdAt, updatedAt, userId, name, pushPlatform, pushSubscription, hasPushSubscription
- **payments** — id, createdAt, updatedAt, userId, transactionId, productId, platformKey, data, receipt
- **words** — id, word, common, created_at
- **puzzles** — id, date, word, created_at
- **guesses** — id, puzzle_id, user_id, guess_number, word, feedback, created_at
- **results** — id, puzzle_id, user_id, solved, attempts, practice, finished_at, created_at
- **user_stats** — user_id, played, wins, current_streak, max_streak, distribution, updated_at

## API surface (handlers)

_These endpoints already exist — open and extend the named file, never recreate it._

- **\_seed** — `api/src/handlers/_seed.ts`
- **leaderboard** — `api/src/handlers/leaderboard.ts`
- **puzzles** — `api/src/handlers/puzzles.ts`
- **stats** — `api/src/handlers/stats.ts`

## Screens (12)

_These pages already exist — edit the named file in place, never create a parallel one._

- **Landing** `/` → `app/src/pages/Landing.tsx`
- **Login** `/login` → `app/src/pages/Login.tsx`
- **Signup** `/signup` → `app/src/pages/Signup.tsx`
- **ForgotPassword** `/forgot-password` → `app/src/pages/ForgotPassword.tsx`
- **ResetPassword** `/reset-password` → `app/src/pages/ResetPassword.tsx`
- **HowToPlay** `/how-to-play` → `app/src/pages/HowToPlay.tsx`
- **Play** `/play` (auth) → `app/src/pages/Play.tsx`
- **Stats** `/stats` (auth) → `app/src/pages/Stats.tsx`
- **Archive** `/archive` (auth) → `app/src/pages/Archive.tsx`
- **ArchivePlay** `/archive/:date` (auth) → `app/src/pages/ArchivePlay.tsx`
- **Leaderboard** `/leaderboard` (auth) → `app/src/pages/Leaderboard.tsx`
- **Settings** `/settings` (auth) → `app/src/pages/Settings.tsx`

## Integrations (9 @molecule/* packages)

- **Database**: `@molecule/api-database-postgresql`
- **Domain resources**: `@molecule/api-resource-user`, `@molecule/api-resource-payment`
- **Email**: `@molecule/api-email-templates`, `@molecule/api-emails-mailgun`
- **Other API**: `@molecule/api-reporting-database`
- **Payments & billing**: `@molecule/api-payments-stripe`, `@molecule/api-entitlements`, `@molecule/app-billing-react`

## Required secrets

- DATABASE_URL — PostgreSQL connection string
- STRIPE_SECRET_KEY — Stripe secret API key (sk_test_... in test mode)
- STRIPE_WEBHOOK_SECRET — Stripe webhook signing secret (whsec_...)
