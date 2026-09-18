# Habit Tracker

- **slug**: `habit-tracker`
- **cluster**: productivity
- **type**: full-stack
- **layout**: dashboard

Habitica-like habit tracking with streaks, statistics, reminders, and achievements

> **This is a complete, working app, already built.** The data model, handlers, and screens below all exist on disk (paths shown). Treat this as the user's existing codebase: **adapt the listed files in place** for the request; do not recreate tables, handlers, or pages that already exist, and do not add packages for functionality already implemented here.

## Features

`auth`, `notifications`, `streaks`, `statistics`, `reminders`

## Data model (10 domain tables)

_Already created by the existing SQL in `api/migrations/` — do NOT add new migrations for these tables._

- **habits** — id, user_id, name, emoji, description, category, cadence, days_of_week, reminder_time, color, target_count, position, …
- **habit_entries** — id, habit_id, user_id, date, completed_at, count, was_freeze, note, created_at, updated_at
- **habit_freezes** — id, user_id, habit_id, granted_at, used_for_date, created_at
- **achievements** — id, code, name, description, icon, threshold_days, tier, created_at
- **user_achievements** — id, user_id, achievement_id, unlocked_at, progress_days, created_at
- **reminders** — id, user_id, habit_id, time_of_day, days_of_week, channel, active, created_at, updated_at
- **notifications** — id, user_id, type, title, body, href, read, created_at
- **devices** — id, createdAt, updatedAt, userId, name, pushPlatform, pushSubscription, hasPushSubscription
- **tags** — id, name, slug, color, description, createdAt, updatedAt
- **resource_tags** — id, tagId, resourceType, resourceId, createdAt

## API surface (handlers)

_These endpoints already exist — open and extend the named file, never recreate it._

- **\_streaks** — `api/src/handlers/_streaks.ts`
- **achievements** — `api/src/handlers/achievements.ts`
- **entries** — `api/src/handlers/entries.ts`
- **freezes** — `api/src/handlers/freezes.ts`
- **habits** — `api/src/handlers/habits.ts`
- **notifications** — `api/src/handlers/notifications.ts`
- **profile** — `api/src/handlers/profile.ts`
- **reminders** — `api/src/handlers/reminders.ts`
- **reports** — `api/src/handlers/reports.ts`
- **stats** — `api/src/handlers/stats.ts`

## Screens (15)

_These pages already exist — edit the named file in place, never create a parallel one._

- **Landing** `/` → `app/src/pages/Landing.tsx`
- **Login** `/login` → `app/src/pages/Login.tsx`
- **Signup** `/signup` → `app/src/pages/Signup.tsx`
- **ForgotPassword** `/forgot-password` → `app/src/pages/ForgotPassword.tsx`
- **ResetPassword** `/reset-password` → `app/src/pages/ResetPassword.tsx`
- **Dashboard** `/dashboard` (auth) → `app/src/pages/Dashboard.tsx`
- **Habits** `/habits` (auth) → `app/src/pages/Habits.tsx`
- **HabitDetail** `/habits/:id` (auth) → `app/src/pages/HabitDetail.tsx`
- **Achievements** `/achievements` (auth) → `app/src/pages/Achievements.tsx`
- **Stats** `/stats` (auth) → `app/src/pages/Stats.tsx`
- **Settings** `/settings` (auth) → `app/src/pages/Settings.tsx`
- **Calendar** `/calendar` (auth) → `app/src/pages/Calendar.tsx`
- **Profile** `/profile` (auth) → `app/src/pages/Profile.tsx`
- **Notifications** `/notifications` (auth) → `app/src/pages/Notifications.tsx`
- **NewHabit** `/habits/new` (auth) → `app/src/pages/NewHabit.tsx`

## Subscription tiers

free / pro / team — gated by: maxEntries, maxHabits, maxStats, advancedFeatures, canExport, retentionDays

## Integrations (9 @molecule/* packages)

- **Database**: `@molecule/api-database-postgresql`
- **Domain resources**: `@molecule/api-resource-user`, `@molecule/api-resource-tag`
- **Frontend / UI**: `@molecule/app-calendar`, `@molecule/app-keyboard-shortcuts-hotkeys`, `@molecule/app-command-palette-cmdk`
- **Notifications**: `@molecule/api-push-notifications-web-push`
- **Other API**: `@molecule/api-cron-node-cron`, `@molecule/api-reporting-database`

## Required secrets

- DATABASE_URL — PostgreSQL connection string
- VAPID_PUBLIC_KEY — VAPID public key for push notifications
- VAPID_PRIVATE_KEY — VAPID private key for push notifications
