# Flashcard App

- **slug**: `flashcard-app`
- **cluster**: education
- **type**: full-stack
- **layout**: dashboard

Anki-like flashcard app with spaced repetition, decks, and study statistics

> **This is a complete, working app, already built.** The data model, handlers, and screens below all exist on disk (paths shown). Treat this as the user's existing codebase: **adapt the listed files in place** for the request; do not recreate tables, handlers, or pages that already exist, and do not add packages for functionality already implemented here.

## Features

`auth`, `search`, `keyboard-shortcuts`

## Data model (10 domain tables)

_Already created by the existing SQL in `api/migrations/` — do NOT add new migrations for these tables._

- **cards** — id, deck_id, user_id, front, back, state, ease_factor, interval_days, repetitions, next_review, last_reviewed, total_reviews, …
- **deck_shares** — id, deck_id, owner_id, shared_with_user_id, role, invite_token, accepted_at, created_at
- **decks** — id, user_id, name, description, category, card_count, new_count, review_count, due_count, retention_rate, total_reviews, last_studied, …
- **devices** — id, createdAt, updatedAt, userId, name, pushPlatform, pushSubscription, hasPushSubscription
- **notifications** — id, user_id, type, title, body, href, unread, created_at
- **payments** — id, createdAt, updatedAt, userId, transactionId, productId, platformKey, data, receipt
- **resource_tags** — id, tagId, resourceType, resourceId, createdAt
- **review_log** — id, card_id, deck_id, user_id, quality, ease_factor, interval_days, state, reviewed_at
- **tags** — id, name, slug, color, description, createdAt, updatedAt
- **user_profiles** — user_id, current_streak, longest_streak, total_reviews, daily_goal, last_study_date, theme, created_at, updated_at

## API surface (handlers)

_These endpoints already exist — open and extend the named file, never recreate it._

- **cards** — `api/src/handlers/cards.ts`
- **decks** — `api/src/handlers/decks.ts`
- **notifications** — `api/src/handlers/notifications.ts`
- **profile** — `api/src/handlers/profile.ts`
- **reports** — `api/src/handlers/reports.ts`
- **stats** — `api/src/handlers/stats.ts`
- **study** — `api/src/handlers/study.ts`

## Screens (14)

_These pages already exist — edit the named file in place, never create a parallel one._

- **Landing** `/` → `app/src/pages/Landing.tsx`
- **Login** `/login` → `app/src/pages/Login.tsx`
- **Signup** `/signup` → `app/src/pages/Signup.tsx`
- **ForgotPassword** `/forgot-password` → `app/src/pages/ForgotPassword.tsx`
- **ResetPassword** `/reset-password` → `app/src/pages/ResetPassword.tsx`
- **Dashboard** `/dashboard` (auth) → `app/src/pages/Dashboard.tsx`
- **Decks** `/decks` (auth) → `app/src/pages/Decks.tsx`
- **Study** `/study/:deckId` (auth) → `app/src/pages/Study.tsx`
- **Stats** `/stats` (auth) → `app/src/pages/Stats.tsx`
- **Settings** `/settings` (auth) → `app/src/pages/Settings.tsx`
- **DeckDetail** `/decks/:deckId` (auth) → `app/src/pages/DeckDetail.tsx`
- **CardNew** `/decks/:deckId/cards/new` (auth) → `app/src/pages/CardNew.tsx`
- **CardEdit** `/decks/:deckId/cards/:cardId/edit` (auth) → `app/src/pages/CardEdit.tsx`
- **SessionSummary** `/study/:deckId/summary` (auth) → `app/src/pages/SessionSummary.tsx`

## Subscription tiers

free / pro / team — gated by: maxCards, maxDecks, advancedFeatures, canExport, retentionDays

## Integrations (13 @molecule/* packages)

- **Database**: `@molecule/api-database-postgresql`
- **Domain resources**: `@molecule/api-resource-user`, `@molecule/api-resource-tag`
- **Frontend / UI**: `@molecule/app-data-table`, `@molecule/app-virtual-scroll`, `@molecule/app-keyboard-shortcuts`, `@molecule/app-command-palette`
- **Other API**: `@molecule/api-cron-node-cron`, `@molecule/api-reporting-database`, `@molecule/api-import-export-csv`
- **Search**: `@molecule/api-search-meilisearch`
- **Uploads & media**: `@molecule/api-image-sharp`, `@molecule/api-uploads-s3`

## Required secrets

- DATABASE_URL — PostgreSQL connection string
- S3_BUCKET — S3 bucket for card images
