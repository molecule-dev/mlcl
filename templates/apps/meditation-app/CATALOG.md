# Meditation App

- **slug**: `meditation-app`
- **cluster**: health-fitness
- **type**: full-stack
- **layout**: dashboard

Headspace-like meditation app with guided sessions, timer, streaks, categories, and audio playback

> **This is a complete, working app, already built.** The data model, handlers, and screens below all exist on disk (paths shown). Treat this as the user's existing codebase: **adapt the listed files in place** for the request; do not recreate tables, handlers, or pages that already exist, and do not add packages for functionality already implemented here.

## Features

`auth`, `search`, `notifications`, `charts`, `audio`

## Data model (11 domain tables)

_Already created by the existing SQL in `api/migrations/` — do NOT add new migrations for these tables._

- **devices** — id, createdAt, updatedAt, userId, name, pushPlatform, pushSubscription, hasPushSubscription
- **journal_entries** — id, user_id, session_id, title, body, mood, tags, written_at, encrypted_body, created_at, updatedAt
- **meditation_categories** — id, slug, label, description, hero_image_key, display_order, is_active, created_at, updatedAt
- **meditation_course_days** — id, course_id, day_number, session_id, title, prep_text, created_at
- **meditation_courses** — id, slug, title, description, day_count, hero_image_key, is_premium, is_published, created_at, updatedAt
- **meditation_history** — id, user_id, session_id, course_id, started_at, completed_at, duration_seconds, reflection_id, created_at, updatedAt
- **meditation_sessions** — id, category_id, slug, title, description, duration_seconds, difficulty, instructor_name, audio_s3_key, transcript_text, hero_image_key, language, …
- **notifications** — id, user_id, kind, payload, read_at, created_at
- **user_favorites** — id, user_id, session_id, course_id, created_at
- **user_preferences** — id, user_id, voice, default_duration_minutes, reminder_enabled, reminder_time, autoplay_next, weekly_goal_minutes, created_at, updatedAt
- **payments** — id, createdAt, updatedAt, userId, transactionId, productId, platformKey, data, receipt

## API surface (handlers)

_These endpoints already exist — open and extend the named file, never recreate it._

- **categories** — `api/src/handlers/categories.ts`
- **courses** — `api/src/handlers/courses.ts`
- **favorites** — `api/src/handlers/favorites.ts`
- **history** — `api/src/handlers/history.ts`
- **journal** — `api/src/handlers/journal.ts`
- **notifications** — `api/src/handlers/notifications.ts`
- **preferences** — `api/src/handlers/preferences.ts`
- **sessions** — `api/src/handlers/sessions.ts`
- **stats** — `api/src/handlers/stats.ts`

## Screens (16)

_These pages already exist — edit the named file in place, never create a parallel one._

- **Landing** `/` → `app/src/pages/Landing.tsx`
- **Login** `/login` → `app/src/pages/Login.tsx`
- **Signup** `/signup` → `app/src/pages/Signup.tsx`
- **ForgotPassword** `/forgot-password` → `app/src/pages/ForgotPassword.tsx`
- **ResetPassword** `/reset-password` → `app/src/pages/ResetPassword.tsx`
- **Home** `/home` (auth) → `app/src/pages/Home.tsx`
- **Library** `/library` (auth) → `app/src/pages/Library.tsx`
- **SessionPlayer** `/sessions/:id` (auth) → `app/src/pages/SessionPlayer.tsx`
- **Courses** `/courses` (auth) → `app/src/pages/Courses.tsx`
- **Journal** `/journal` (auth) → `app/src/pages/Journal.tsx`
- **Stats** `/stats` (auth) → `app/src/pages/Stats.tsx`
- **Settings** `/settings` (auth) → `app/src/pages/Settings.tsx`
- **CourseDetail** `/courses/:id` (auth) → `app/src/pages/CourseDetail.tsx`
- **Profile** `/profile` (auth) → `app/src/pages/Profile.tsx`
- **Notifications** `/notifications` (auth) → `app/src/pages/Notifications.tsx`
- **Search** `/search` (auth) → `app/src/pages/Search.tsx`

## Subscription tiers

free / pro / team — gated by: maxCategories, maxHistory, maxSessions, maxStats, advancedFeatures, canExport, retentionDays

## Integrations (11 @molecule/* packages)

- **Database**: `@molecule/api-database-postgresql`
- **Domain resources**: `@molecule/api-resource-user`
- **Frontend / UI**: `@molecule/app-charts`, `@molecule/app-audio-howler`, `@molecule/app-calendar`, `@molecule/app-command-palette`
- **Notifications**: `@molecule/api-push-notifications-web-push`
- **Other API**: `@molecule/api-reporting-database`, `@molecule/api-cron-node-cron`
- **Search**: `@molecule/api-search-meilisearch`
- **Uploads & media**: `@molecule/api-uploads-s3`

## Required secrets

- DATABASE_URL — PostgreSQL connection string
- MEILISEARCH_API_KEY — Meilisearch API key
- VAPID_PUBLIC_KEY — VAPID public key for push notifications
- VAPID_PRIVATE_KEY — VAPID private key for push notifications
- S3_BUCKET — S3 bucket for audio files
- S3_ACCESS_KEY_ID — S3 access key ID
- S3_SECRET_ACCESS_KEY — S3 secret access key
