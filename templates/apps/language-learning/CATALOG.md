# Language Learning

- **slug**: `language-learning`
- **cluster**: education
- **type**: full-stack
- **layout**: dashboard

Duolingo-like language learning app with lessons, exercises, streaks, and XP

> **This is a complete, working app, already built.** The data model, handlers, and screens below all exist on disk (paths shown). Treat this as the user's existing codebase: **adapt the listed files in place** for the request; do not recreate tables, handlers, or pages that already exist, and do not add packages for functionality already implemented here.

## Features

`auth`, `notifications`, `speech`

## Data model (13 domain tables)

_Already created by the existing SQL in `api/migrations/` — do NOT add new migrations for these tables._

- **activities** — id, actorId, action, resourceType, resourceId, metadata, createdAt
- **activity_seen_status** — userId, lastSeenActivityId, updatedAt
- **course_enrollments** — id, course_id, user_id, current_unit, current_lesson, enrolled_at
- **devices** — id, createdAt, updatedAt, userId, name, pushPlatform, pushSubscription, hasPushSubscription
- **exercise_results** — id, exercise_id, user_id, answer, is_correct, xp_earned, time_taken_ms, completed_at
- **exercises** — id, lesson_id, type, prompt, choices, correct_answer, explanation, xp_value, position, created_at
- **follows** — id, followerId, targetType, targetId, createdAt, updatedAt
- **language_courses** — id, language_name, language_code, flag, level, unit_count, lesson_count, description, icon, tone, progress_percent, created_at
- **lessons** — id, unit_id, course_id, title, duration_min, lessons_remaining, progress_percent, level, language, flag, tone, icon, …
- **notifications** — id, user_id, type, title, body, href, unread, created_at
- **units** — id, course_id, position, title, description, created_at
- **user_profiles** — user_id, total_xp, lessons_completed, current_streak, longest_streak, daily_goal_xp, last_activity, target_languages, theme, created_at, updated_at
- **vocabulary_items** — id, user_id, word, pronunciation, translation, example, language_code, mastery, next_review_iso, created_at, updated_at

## API surface (handlers)

_These endpoints already exist — open and extend the named file, never recreate it._

- **\_seed** — `api/src/handlers/_seed.ts`
- **courses** — `api/src/handlers/courses.ts`
- **dashboard** — `api/src/handlers/dashboard.ts`
- **exercises** — `api/src/handlers/exercises.ts`
- **leaderboard** — `api/src/handlers/leaderboard.ts`
- **lessons** — `api/src/handlers/lessons.ts`
- **practice** — `api/src/handlers/practice.ts`
- **preferences** — `api/src/handlers/preferences.ts`
- **progress** — `api/src/handlers/progress.ts`
- **vocabulary** — `api/src/handlers/vocabulary.ts`

## Screens (13)

_These pages already exist — edit the named file in place, never create a parallel one._

- **Landing** `/` → `app/src/pages/Landing.tsx`
- **Login** `/login` → `app/src/pages/Login.tsx`
- **Signup** `/signup` → `app/src/pages/Signup.tsx`
- **ForgotPassword** `/forgot-password` → `app/src/pages/ForgotPassword.tsx`
- **ResetPassword** `/reset-password` → `app/src/pages/ResetPassword.tsx`
- **Dashboard** `/dashboard` (auth) → `app/src/pages/Dashboard.tsx`
- **Lessons** `/lessons` (auth) → `app/src/pages/Lessons.tsx`
- **LessonDetail** `/lessons/:id` (auth) → `app/src/pages/LessonDetail.tsx`
- **Vocabulary** `/vocabulary` (auth) → `app/src/pages/Vocabulary.tsx`
- **Practice** `/practice` (auth) → `app/src/pages/Practice.tsx`
- **Leaderboard** `/leaderboard` (auth) → `app/src/pages/Leaderboard.tsx`
- **Profile** `/profile` (auth) → `app/src/pages/Profile.tsx`
- **Settings** `/settings` (auth) → `app/src/pages/Settings.tsx`

## Subscription tiers

free / pro / team — gated by: maxCourses, maxExercises, maxLeaderboard, maxLessons, maxProgress, advancedFeatures, canExport, retentionDays

## Integrations (13 @molecule/* packages)

- **AI**: `@molecule/api-ai-speech-openai`
- **Database**: `@molecule/api-database-postgresql`
- **Domain resources**: `@molecule/api-resource-user`, `@molecule/api-resource-activity-feed`, `@molecule/api-resource-follow`
- **Frontend / UI**: `@molecule/app-data-table`, `@molecule/app-virtual-scroll`, `@molecule/app-command-palette`
- **Notifications**: `@molecule/api-push-notifications-web-push`
- **Other API**: `@molecule/api-cron-node-cron`, `@molecule/api-reporting-database`
- **Uploads & media**: `@molecule/api-image-sharp`, `@molecule/api-uploads-s3`

## Required secrets

- DATABASE_URL — PostgreSQL connection string
- OPENAI_API_KEY — OpenAI API key for speech
- S3_BUCKET — S3 bucket for audio assets
