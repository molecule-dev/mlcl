# Quiz Platform

- **slug**: `quiz-platform`
- **cluster**: education
- **type**: full-stack
- **layout**: dashboard

Kahoot-like quiz platform with timed questions, scoring, and leaderboards

> **This is a complete, working app, already built.** The data model, handlers, and screens below all exist on disk (paths shown). Treat this as the user's existing codebase: **adapt the listed files in place** for the request; do not recreate tables, handlers, or pages that already exist, and do not add packages for functionality already implemented here.

## Features

`auth`, `realtime`, `search`, `leaderboard`

## Data model (11 domain tables)

_Already created by the existing SQL in `api/migrations/` — do NOT add new migrations for these tables._

- **devices** — id, createdAt, updatedAt, userId, name, pushPlatform, pushSubscription, hasPushSubscription
- **payments** — id, createdAt, updatedAt, userId, transactionId, productId, platformKey, data, receipt
- **notifications** — id, user_id, type, title, body, href, read, created_at
- **questions** — id, quiz_id, position, type, prompt, choices, correct_answer, points, time_limit_s, image_url, explanation, created_at, …
- **quiz_sessions** — id, quiz_id, host_id, join_code, status, current_question, started_at, finished_at, created_at, updated_at
- **quizzes** — id, creator_id, title, description, category, status, cover_url, time_per_question_s, scoring_mode, play_count, published_at, created_at, …
- **reactions** — id, resourceType, resourceId, userId, type, createdAt, updatedAt
- **resource_tags** — id, tagId, resourceType, resourceId, createdAt
- **session_answers** — id, session_id, user_id, question_id, answer, time_taken_ms, is_correct, points_earned, answered_at
- **session_participants** — id, session_id, user_id, nickname, score, joined_at, created_at
- **tags** — id, name, slug, color, description, createdAt, updatedAt

## API surface (handlers)

_These endpoints already exist — open and extend the named file, never recreate it._

- **\_seed** — `api/src/handlers/_seed.ts`
- **leaderboard** — `api/src/handlers/leaderboard.ts`
- **notifications** — `api/src/handlers/notifications.ts`
- **questions** — `api/src/handlers/questions.ts`
- **quizzes** — `api/src/handlers/quizzes.ts`
- **sessions** — `api/src/handlers/sessions.ts`

## Screens (16)

_These pages already exist — edit the named file in place, never create a parallel one._

- **Landing** `/` → `app/src/pages/Landing.tsx`
- **Login** `/login` → `app/src/pages/Login.tsx`
- **Signup** `/signup` → `app/src/pages/Signup.tsx`
- **ForgotPassword** `/forgot-password` → `app/src/pages/ForgotPassword.tsx`
- **ResetPassword** `/reset-password` → `app/src/pages/ResetPassword.tsx`
- **Discover** `/discover` (auth) → `app/src/pages/Discover.tsx`
- **QuizPlay** `/quiz/:id/play` (auth) → `app/src/pages/QuizPlay.tsx`
- **QuizBuilder** `/quiz/:id/edit` (auth) → `app/src/pages/QuizBuilder.tsx`
- **MyQuizzes** `/my-quizzes` (auth) → `app/src/pages/MyQuizzes.tsx`
- **Results** `/quiz/:id/results` (auth) → `app/src/pages/Results.tsx`
- **Leaderboard** `/leaderboard` (auth) → `app/src/pages/Leaderboard.tsx`
- **Settings** `/settings` (auth) → `app/src/pages/Settings.tsx`
- **QuizDetail** `/quiz/:id` (auth) → `app/src/pages/QuizDetail.tsx`
- **HostLobby** `/quiz/:id/lobby` (auth) → `app/src/pages/HostLobby.tsx`
- **Profile** `/u/:username` (auth) → `app/src/pages/Profile.tsx`
- **Notifications** `/notifications` (auth) → `app/src/pages/Notifications.tsx`

## Subscription tiers

free / pro / team — gated by: maxLeaderboard, maxQuestions, maxQuizzes, maxSessions, advancedFeatures, canExport, retentionDays

## Integrations (14 @molecule/* packages)

- **Database**: `@molecule/api-database-postgresql`
- **Domain resources**: `@molecule/api-resource-user`, `@molecule/api-resource-tag`, `@molecule/api-resource-reaction`
- **Frontend / UI**: `@molecule/app-data-table`, `@molecule/app-virtual-scroll`, `@molecule/app-command-palette`
- **Other API**: `@molecule/api-cron-node-cron`, `@molecule/api-reporting-database`
- **Realtime**: `@molecule/api-realtime-socketio`, `@molecule/app-realtime-socketio`
- **Search**: `@molecule/api-search-meilisearch`
- **Uploads & media**: `@molecule/api-image-sharp`, `@molecule/api-uploads-s3`

## Required secrets

- DATABASE_URL — PostgreSQL connection string
- S3_BUCKET — S3 bucket for quiz images
