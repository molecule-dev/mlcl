# Mental Health Journal

- **slug**: `mental-health-journal`
- **cluster**: health-fitness
- **type**: full-stack
- **layout**: dashboard

Daylio-like mental health journal with mood tracking, journal entries, pattern analysis, and wellness insights

> **This is a complete, working app, already built.** The data model, handlers, and screens below all exist on disk (paths shown). Treat this as the user's existing codebase: **adapt the listed files in place** for the request; do not recreate tables, handlers, or pages that already exist, and do not add packages for functionality already implemented here.

## Features

`auth`, `notifications`, `encryption`, `reporting`, `ai-insights`

## Data model (8 domain tables)

_Already created by the existing SQL in `api/migrations/` — do NOT add new migrations for these tables._

- **activities** — id, user_id, slug, label, icon, category, sort_order, is_active, created_at, updatedAt
- **devices** — id, createdAt, updatedAt, userId, name, pushPlatform, pushSubscription, hasPushSubscription
- **goal_progress** — id, goal_id, user_id, period_starts_at, value, hit_target, computed_at, created_at
- **journal_entries** — id, user_id, written_at, title, body, body_encrypted, body_iv, mood_id, prompt_id, activity_ids, tags, word_count, …
- **mood_entries** — id, user_id, recorded_at, score, energy, anxiety, label, activities, notes, journal_entry_id, created_at, updatedAt
- **notifications** — id, user_id, kind, payload, read_at, created_at
- **prompts** — id, slug, category, body_template, is_active, locale, created_at, updatedAt
- **wellness_goals** — id, user_id, title, description, category, kind, target_value, period, starts_at, ends_at, target_date, status, …

## API surface (handlers)

_These endpoints already exist — open and extend the named file, never recreate it._

- **journal** — `api/src/handlers/journal.ts`

## Screens (14)

_These pages already exist — edit the named file in place, never create a parallel one._

- **Landing** `/` → `app/src/pages/Landing.tsx`
- **Login** `/login` → `app/src/pages/Login.tsx`
- **Signup** `/signup` → `app/src/pages/Signup.tsx`
- **ForgotPassword** `/forgot-password` → `app/src/pages/ForgotPassword.tsx`
- **ResetPassword** `/reset-password` → `app/src/pages/ResetPassword.tsx`
- **Home** `/home` (auth) → `app/src/pages/Home.tsx`
- **Journal** `/journal` (auth) → `app/src/pages/Journal.tsx`
- **EntryComposer** `/journal/new` (auth) → `app/src/pages/EntryComposer.tsx`
- **EntryDetail** `/journal/:id` (auth) → `app/src/pages/EntryDetail.tsx`
- **Insights** `/insights` (auth) → `app/src/pages/Insights.tsx`
- **Prompts** `/prompts` (auth) → `app/src/pages/Prompts.tsx`
- **Settings** `/settings` (auth) → `app/src/pages/Settings.tsx`
- **Calendar** `/calendar` (auth) → `app/src/pages/Calendar.tsx`
- **Profile** `/profile` (auth) → `app/src/pages/Profile.tsx`

## Subscription tiers

free / pro / team — gated by: maxActivities, maxEntries, maxGoals, maxInsights, maxMood, advancedFeatures, canExport, retentionDays

## Integrations (12 @molecule/* packages)

- **AI**: `@molecule/api-ai-anthropic`
- **Database**: `@molecule/api-database-postgresql`
- **Domain resources**: `@molecule/api-resource-user`
- **Frontend / UI**: `@molecule/app-charts`, `@molecule/app-calendar`, `@molecule/app-date-range-picker`, `@molecule/app-command-palette`
- **Notifications**: `@molecule/api-push-notifications-web-push`
- **Other API**: `@molecule/api-encryption-aes`, `@molecule/api-reporting-database`, `@molecule/api-cron-node-cron`, `@molecule/api-import-export-csv`

## Required secrets

- DATABASE_URL — PostgreSQL connection string
- ENCRYPTION_KEY — AES encryption key for journal data
- VAPID_PUBLIC_KEY — VAPID public key for push notifications
- VAPID_PRIVATE_KEY — VAPID private key for push notifications
