# Sleep Tracker

- **slug**: `sleep-tracker`
- **cluster**: health-fitness
- **type**: full-stack
- **layout**: dashboard

Sleep Cycle-like sleep tracker with sleep logs, quality scores, trends, smart alarm, and sleep hygiene tips

> **This is a complete, working app, already built.** The data model, handlers, and screens below all exist on disk (paths shown). Treat this as the user's existing codebase: **adapt the listed files in place** for the request; do not recreate tables, handlers, or pages that already exist, and do not add packages for functionality already implemented here.

## Features

`auth`, `notifications`, `reporting`

## Data model (9 domain tables)

_Already created by the existing SQL in `api/migrations/` — do NOT add new migrations for these tables._

- **sleep_logs** — id, user_id, sleep_date, bedtime, wake_time, duration_minutes, quality_score, efficiency_pct, interruptions, source, source_payload, notes, …
- **sleep_stages** — id, sleep_log_id, user_id, stage, starts_at, ends_at, created_at
- **sleep_factors** — id, user_id, sleep_log_id, kind, value, numeric_value, recorded_at, created_at
- **factor_definitions** — id, slug, label, category, impact, unit, icon, created_at
- **sleep_alarms** — id, user_id, label, alarm_time, window_minutes, days_of_week, sound, vibration_pattern, enabled, created_at, updated_at
- **wearable_connections** — id, user_id, provider, external_user_id, access_token_encrypted, refresh_token_encrypted, scopes, last_synced_at, is_active, created_at, updated_at
- **coaching_articles** — id, slug, title, body_markdown, category, hero_image_key, is_premium, is_published, published_at, created_at, updated_at
- **notifications** — id, user_id, kind, title, body, href, payload, read, read_at, created_at
- **devices** — id, createdAt, updatedAt, userId, name, pushPlatform, pushSubscription, hasPushSubscription

## API surface (handlers)

_These endpoints already exist — open and extend the named file, never recreate it._

- **alarms** — `api/src/handlers/alarms.ts`
- **coaching** — `api/src/handlers/coaching.ts`
- **factors** — `api/src/handlers/factors.ts`
- **notifications** — `api/src/handlers/notifications.ts`
- **sleep** — `api/src/handlers/sleep.ts`
- **stats** — `api/src/handlers/stats.ts`
- **wearables** — `api/src/handlers/wearables.ts`

## Screens (16)

_These pages already exist — edit the named file in place, never create a parallel one._

- **Landing** `/` → `app/src/pages/Landing.tsx`
- **Login** `/login` → `app/src/pages/Login.tsx`
- **Signup** `/signup` → `app/src/pages/Signup.tsx`
- **ForgotPassword** `/forgot-password` → `app/src/pages/ForgotPassword.tsx`
- **ResetPassword** `/reset-password` → `app/src/pages/ResetPassword.tsx`
- **Dashboard** `/dashboard` (auth) → `app/src/pages/Dashboard.tsx`
- **Night** `/night/:date` (auth) → `app/src/pages/Night.tsx`
- **Trends** `/trends` (auth) → `app/src/pages/Trends.tsx`
- **Coaching** `/coaching` (auth) → `app/src/pages/Coaching.tsx`
- **Devices** `/devices` (auth) → `app/src/pages/Devices.tsx`
- **Settings** `/settings` (auth) → `app/src/pages/Settings.tsx`
- **NightHistory** `/history` (auth) → `app/src/pages/NightHistory.tsx`
- **SmartAlarm** `/alarm` (auth) → `app/src/pages/SmartAlarm.tsx`
- **Profile** `/profile` (auth) → `app/src/pages/Profile.tsx`
- **Notifications** `/notifications` (auth) → `app/src/pages/Notifications.tsx`
- **CoachingDetail** `/coaching/:id` (auth) → `app/src/pages/CoachingDetail.tsx`

## Subscription tiers

free / pro / team — gated by: maxAlarms, maxFactors, maxSleep, maxStats, advancedFeatures, canExport, retentionDays

## Integrations (10 @molecule/* packages)

- **Database**: `@molecule/api-database-postgresql`
- **Domain resources**: `@molecule/api-resource-user`
- **Frontend / UI**: `@molecule/app-charts`, `@molecule/app-calendar`, `@molecule/app-date-range-picker`, `@molecule/app-command-palette`
- **Notifications**: `@molecule/api-push-notifications-web-push`
- **Other API**: `@molecule/api-reporting-database`, `@molecule/api-cron-node-cron`, `@molecule/api-import-export-csv`

## Required secrets

- DATABASE_URL — PostgreSQL connection string
- VAPID_PUBLIC_KEY — VAPID public key for push notifications
- VAPID_PRIVATE_KEY — VAPID private key for push notifications
