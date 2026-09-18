# Workout Tracker

- **slug**: `workout-tracker`
- **cluster**: health-fitness
- **type**: full-stack
- **layout**: dashboard

Strong-like workout tracker with exercises, sets, reps, weight logging, and progress charts

> **This is a complete, working app, already built.** The data model, handlers, and screens below all exist on disk (paths shown). Treat this as the user's existing codebase: **adapt the listed files in place** for the request; do not recreate tables, handlers, or pages that already exist, and do not add packages for functionality already implemented here.

## Features

`auth`, `search`, `notifications`, `charts`, `calendar`

## Data model (9 domain tables)

_Already created by the existing SQL in `api/migrations/` — do NOT add new migrations for these tables._

- **exercises** — id, user_id, slug, name, description, instructions, muscle_group, muscle_groups, equipment, category, difficulty, video_s3_key, …
- **routines** — id, user_id, name, description, target_muscle_groups, estimated_duration_minutes, day_count, is_template, is_public, created_at, updated_at
- **routine_exercises** — id, routine_id, exercise_id, day_index, order_index, sort_order, target_sets, target_reps, target_weight_pct, target_rest_seconds, sets, reps, …
- **workouts** — id, user_id, routine_id, day_index, name, notes, started_at, completed_at, duration_seconds, total_volume, total_volume_kg, body_weight_kg, …
- **workout_sets** — id, workout_id, user_id, exercise_id, set_index, set_number, order_index, weight, weight_kg, weight_unit, reps, rpe, …
- **personal_records** — id, user_id, exercise_id, workout_id, kind, value, achieved_at, created_at
- **body_measurements** — id, user_id, recorded_at, weight_kg, body_fat_pct, chest_cm, waist_cm, hips_cm, thigh_cm, bicep_cm, photo_s3_key, notes, …
- **payments** — id, createdAt, updatedAt, userId, transactionId, productId, platformKey, data, receipt
- **devices** — id, createdAt, updatedAt, userId, name, pushPlatform, pushSubscription, hasPushSubscription

## API surface (handlers)

_These endpoints already exist — open and extend the named file, never recreate it._

- **exercises** — `api/src/handlers/exercises.ts`
- **measurements** — `api/src/handlers/measurements.ts`
- **progress** — `api/src/handlers/progress.ts`
- **records** — `api/src/handlers/records.ts`
- **routines** — `api/src/handlers/routines.ts`
- **workouts** — `api/src/handlers/workouts.ts`

## Screens (16)

_These pages already exist — edit the named file in place, never create a parallel one._

- **Landing** `/` → `app/src/pages/Landing.tsx`
- **Login** `/login` → `app/src/pages/Login.tsx`
- **Signup** `/signup` → `app/src/pages/Signup.tsx`
- **ForgotPassword** `/forgot-password` → `app/src/pages/ForgotPassword.tsx`
- **ResetPassword** `/reset-password` → `app/src/pages/ResetPassword.tsx`
- **Dashboard** `/dashboard` (auth) → `app/src/pages/Dashboard.tsx`
- **ActiveWorkout** `/workout/active` (auth) → `app/src/pages/ActiveWorkout.tsx`
- **Exercises** `/exercises` (auth) → `app/src/pages/Exercises.tsx`
- **ExerciseDetail** `/exercises/:id` (auth) → `app/src/pages/ExerciseDetail.tsx`
- **History** `/history` (auth) → `app/src/pages/History.tsx`
- **Templates** `/templates` (auth) → `app/src/pages/Templates.tsx`
- **Settings** `/settings` (auth) → `app/src/pages/Settings.tsx`
- **TemplateEditor** `/templates/:id/edit` (auth) → `app/src/pages/TemplateEditor.tsx`
- **WorkoutDetail** `/history/:id` (auth) → `app/src/pages/WorkoutDetail.tsx`
- **BodyMeasurements** `/measurements` (auth) → `app/src/pages/BodyMeasurements.tsx`
- **PersonalRecords** `/records` (auth) → `app/src/pages/PersonalRecords.tsx`

## Subscription tiers

free / pro / team — gated by: maxExercises, maxProgress, maxRoutines, maxWorkouts, advancedFeatures, canExport, retentionDays

## Integrations (12 @molecule/* packages)

- **Database**: `@molecule/api-database-postgresql`
- **Domain resources**: `@molecule/api-resource-user`
- **Frontend / UI**: `@molecule/app-charts`, `@molecule/app-data-table`, `@molecule/app-calendar`, `@molecule/app-virtual-scroll`, `@molecule/app-command-palette`
- **Notifications**: `@molecule/api-push-notifications-web-push`
- **Other API**: `@molecule/api-reporting-database`, `@molecule/api-cron-node-cron`, `@molecule/api-import-export-csv`
- **Search**: `@molecule/api-search-meilisearch`

## Required secrets

- DATABASE_URL — PostgreSQL connection string
- MEILISEARCH_API_KEY — Meilisearch API key
- VAPID_PUBLIC_KEY — VAPID public key for push notifications
- VAPID_PRIVATE_KEY — VAPID private key for push notifications
