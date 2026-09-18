# Video Streaming

- **slug**: `video-streaming`
- **cluster**: content-social
- **type**: full-stack
- **layout**: dashboard

YouTube-like video platform with upload, chapters, and subtitles

> **This is a complete, working app, already built.** The data model, handlers, and screens below all exist on disk (paths shown). Treat this as the user's existing codebase: **adapt the listed files in place** for the request; do not recreate tables, handlers, or pages that already exist, and do not add packages for functionality already implemented here.

## Features

`auth`, `search`, `video-upload`, `hls-streaming`, `chapters`, `subtitles`, `comments`, `likes`, `subscriptions`

## Data model (14 domain tables)

_Already created by the existing SQL in `api/migrations/` — do NOT add new migrations for these tables._

- **channels** — id, owner_id, user_id, name, handle, bio, banner_url, avatar_url, subscriber_count, created_at, updatedAt
- **comments** — id, resourceType, resourceId, userId, parentId, body, editedAt, createdAt, updatedAt
- **devices** — id, createdAt, updatedAt, userId, name, pushPlatform, pushSubscription, hasPushSubscription
- **follows** — id, followerId, targetType, targetId, createdAt, updatedAt
- **notifications** — id, user_id, kind, payload, read_at, created_at, updatedAt
- **playlist_videos** — id, playlist_id, video_id, position, added_at, updatedAt
- **playlists** — id, user_id, owner_id, name, description, is_public, cover_video_id, video_count, created_at, updated_at, updatedAt
- **reactions** — id, resourceType, resourceId, userId, type, createdAt, updatedAt
- **resource_tags** — id, tagId, resourceType, resourceId, createdAt
- **tags** — id, name, slug, color, description, createdAt, updatedAt
- **video_views** — id, video_id, viewer_id, source, ts, updatedAt
- **videos** — id, user_id, channel_id, title, description, hls_url, source_url, thumbnail_url, subtitles_url, duration_sec, status, published_at, …
- **watch_history** — id, user_id, video_id, position_sec, watched_at, updatedAt
- **watch_later** — id, user_id, video_id, added_at, updatedAt

## API surface (handlers)

_These endpoints already exist — open and extend the named file, never recreate it._

- **channels** — `api/src/handlers/channels.ts`
- **comments** — `api/src/handlers/comments.ts`
- **follows** — `api/src/handlers/follows.ts`
- **library** — `api/src/handlers/library.ts`
- **notifications** — `api/src/handlers/notifications.ts`
- **playlists** — `api/src/handlers/playlists.ts`
- **studio** — `api/src/handlers/studio.ts`
- **videos** — `api/src/handlers/videos.ts`

## Screens (17)

_These pages already exist — edit the named file in place, never create a parallel one._

- **Landing** `/` → `app/src/pages/Landing.tsx`
- **Login** `/login` → `app/src/pages/Login.tsx`
- **Signup** `/signup` → `app/src/pages/Signup.tsx`
- **ForgotPassword** `/forgot-password` → `app/src/pages/ForgotPassword.tsx`
- **ResetPassword** `/reset-password` → `app/src/pages/ResetPassword.tsx`
- **Home** `/home` (auth) → `app/src/pages/Home.tsx`
- **Watch** `/watch/:id` (auth) → `app/src/pages/Watch.tsx`
- **Channel** `/channel/:id` (auth) → `app/src/pages/Channel.tsx`
- **Subscriptions** `/subscriptions` (auth) → `app/src/pages/Subscriptions.tsx`
- **Library** `/library` (auth) → `app/src/pages/Library.tsx`
- **Upload** `/upload` (auth) → `app/src/pages/Upload.tsx`
- **Settings** `/settings` (auth) → `app/src/pages/Settings.tsx`
- **Search** `/search` (auth) → `app/src/pages/Search.tsx`
- **Trending** `/trending` (auth) → `app/src/pages/Trending.tsx`
- **Notifications** `/notifications` (auth) → `app/src/pages/Notifications.tsx`
- **Studio** `/studio` (auth) → `app/src/pages/Studio.tsx`
- **PlaylistDetail** `/playlist/:id` (auth) → `app/src/pages/PlaylistDetail.tsx`

## Subscription tiers

free / pro / team — gated by: maxChannels, maxVideos, advancedFeatures, canExport, retentionDays

## Integrations (11 @molecule/* packages)

- **AI**: `@molecule/api-ai-speech-openai`
- **Database**: `@molecule/api-database-postgresql`
- **Domain resources**: `@molecule/api-resource-user`, `@molecule/api-resource-comment`, `@molecule/api-resource-reaction`, `@molecule/api-resource-tag`, `@molecule/api-resource-follow`
- **Frontend / UI**: `@molecule/app-virtual-scroll`
- **Search**: `@molecule/api-search-meilisearch`
- **Uploads & media**: `@molecule/api-uploads-s3`, `@molecule/api-media-streaming-hls`

## Required secrets

- DATABASE_URL — PostgreSQL connection string
- MEILISEARCH_API_KEY — MeiliSearch API key
- S3_BUCKET — S3 bucket for video/image uploads
- S3_ACCESS_KEY_ID — S3 access key
- S3_SECRET_ACCESS_KEY — S3 secret key
- OPENAI_API_KEY — OpenAI API key for transcription
