# Podcast Platform

- **slug**: `podcast`
- **cluster**: content-social
- **type**: full-stack
- **layout**: dashboard

Podcast hosting with audio player, episodes, RSS, and subscriptions

> **This is a complete, working app, already built.** The data model, handlers, and screens below all exist on disk (paths shown). Treat this as the user's existing codebase: **adapt the listed files in place** for the request; do not recreate tables, handlers, or pages that already exist, and do not add packages for functionality already implemented here.

## Features

`auth`, `search`, `audio-player`, `rss-feed`, `subscriptions`, `transcription`, `episodes`

## Data model (11 domain tables)

_Already created by the existing SQL in `api/migrations/` — do NOT add new migrations for these tables._

- **chapters** — id, episode_id, user_id, start_seconds, title, created_at, updatedAt
- **devices** — id, createdAt, updatedAt, userId, name, pushPlatform, pushSubscription, hasPushSubscription
- **episodes** — id, user_id, show_id, title, description, episode_number, season_number, audio_url, duration_seconds, status, transcript, show_notes, …
- **listening_progress** — id, user_id, episode_id, position_sec, completed_at, updated_at, updatedAt
- **notifications** — id, user_id, kind, payload, read_at, created_at, updatedAt
- **payments** — id, createdAt, updatedAt, userId, transactionId, productId, platformKey, data, receipt
- **queue_items** — id, user_id, episode_id, position, added_at, updatedAt
- **shows** — id, user_id, author_id, title, slug, description, cover_image_url, language, category, is_explicit, episode_count, subscriber_count, …
- **subscriptions** — id, user_id, show_id, created_at, updatedAt
- **saved_episodes** — id, user_id, episode_id, saved_at, updatedAt
- **user_preferences** — user_id, preferences, updated_at, updatedAt

## API surface (handlers)

_These endpoints already exist — open and extend the named file, never recreate it._

- **\_seed** — `api/src/handlers/_seed.ts`
- **chapters** — `api/src/handlers/chapters.ts`
- **episodes** — `api/src/handlers/episodes.ts`
- **feed** — `api/src/handlers/feed.ts`
- **notifications** — `api/src/handlers/notifications.ts`
- **profile** — `api/src/handlers/profile.ts`
- **queue** — `api/src/handlers/queue.ts`
- **reports** — `api/src/handlers/reports.ts`
- **saved** — `api/src/handlers/saved.ts`
- **shows** — `api/src/handlers/shows.ts`
- **subscriptions** — `api/src/handlers/subscriptions.ts`

## Screens (14)

_These pages already exist — edit the named file in place, never create a parallel one._

- **Landing** `/` → `app/src/pages/Landing.tsx`
- **Login** `/login` → `app/src/pages/Login.tsx`
- **Signup** `/signup` → `app/src/pages/Signup.tsx`
- **ForgotPassword** `/forgot-password` → `app/src/pages/ForgotPassword.tsx`
- **ResetPassword** `/reset-password` → `app/src/pages/ResetPassword.tsx`
- **Discover** `/discover` (auth) → `app/src/pages/Discover.tsx`
- **ShowDetail** `/shows/:id` (auth) → `app/src/pages/ShowDetail.tsx`
- **EpisodePlayer** `/episodes/:id` (auth) → `app/src/pages/EpisodePlayer.tsx`
- **Library** `/library` (auth) → `app/src/pages/Library.tsx`
- **Queue** `/queue` (auth) → `app/src/pages/Queue.tsx`
- **Settings** `/settings` (auth) → `app/src/pages/Settings.tsx`
- **Search** `/search` (auth) → `app/src/pages/Search.tsx`
- **Notifications** `/notifications` (auth) → `app/src/pages/Notifications.tsx`
- **Profile** `/profile` (auth) → `app/src/pages/Profile.tsx`

## Subscription tiers

free / pro / team — gated by: maxEpisodes, maxShows, maxSubscriptions, advancedFeatures, canExport, retentionDays

## Integrations (12 @molecule/* packages)

- **AI**: `@molecule/api-ai-speech-openai`, `@molecule/api-ai-summarization`
- **Database**: `@molecule/api-database-postgresql`
- **Domain resources**: `@molecule/api-resource-user`, `@molecule/api-resource-comment`, `@molecule/api-resource-reaction`, `@molecule/api-resource-follow`
- **Frontend / UI**: `@molecule/app-audio-howler`, `@molecule/app-virtual-scroll`
- **Other API**: `@molecule/api-sitemap-xml`
- **Search**: `@molecule/api-search-meilisearch`
- **Uploads & media**: `@molecule/api-uploads-s3`

## Required secrets

- DATABASE_URL — PostgreSQL connection string
- MEILISEARCH_API_KEY — MeiliSearch API key
- S3_BUCKET — S3 bucket for audio/image uploads
- S3_ACCESS_KEY_ID — S3 access key
- S3_SECRET_ACCESS_KEY — S3 secret key
- OPENAI_API_KEY — OpenAI API key for transcription
