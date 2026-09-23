# Screen Sharing

- **slug**: `screen-sharing`
- **cluster**: communication
- **type**: full-stack
- **layout**: dashboard

Loom-like screen recording with capture, sharing links, viewer analytics, and comments

> **This is a complete, working app, already built.** The data model, handlers, and screens below all exist on disk (paths shown). Treat this as the user's existing codebase: **adapt the listed files in place** for the request; do not recreate tables, handlers, or pages that already exist, and do not add packages for functionality already implemented here.

## Features

`auth`, `recording`, `sharing`, `analytics`, `comments`

## Data model (10 domain tables)

_Already created by the existing SQL in `api/migrations/` — do NOT add new migrations for these tables._

- **comments** — id, resourceType, resourceId, userId, parentId, body, editedAt, createdAt, updatedAt
- **devices** — id, createdAt, updatedAt, userId, name, pushPlatform, pushSubscription, hasPushSubscription
- **folders** — id, workspace_id, owner_id, name, parent_id, created_at, updated_at
- **reactions** — id, resourceType, resourceId, userId, type, createdAt, updatedAt
- **recording_comments** — id, recording_id, owner_id, user_id, name, content, timestamp_ms, parent_comment_id, created_at, updated_at
- **recording_views** — id, recording_id, owner_id, viewer_user_id, viewer_email, viewer_ip, ip_hash, user_agent, watched_seconds_total, watch_percent, watched_until, completed_at, …
- **recordings** — id, owner_id, workspace_id, folder_id, title, description, duration_ms, size_bytes, video_url, thumbnail_url, gif_url, status, …
- **share_links** — id, recording_id, owner_id, token, password_hash, expires_at, max_views, allow_download, view_count, created_at, updated_at
- **workspace_members** — id, workspace_id, user_id, role, invited_by, joined_at, created_at, updated_at
- **workspaces** — id, owner_id, name, slug, plan_key, seat_limit, created_at, updated_at

## API surface (handlers)

_These endpoints already exist — open and extend the named file, never recreate it._

- **analytics** — `api/src/handlers/analytics.ts`
- **comments** — `api/src/handlers/comments.ts`
- **folders** — `api/src/handlers/folders.ts`
- **notifications** — `api/src/handlers/notifications.ts`
- **recordings** — `api/src/handlers/recordings.ts`
- **settings** — `api/src/handlers/settings.ts`
- **share-links** — `api/src/handlers/share-links.ts`
- **views** — `api/src/handlers/views.ts`
- **workspace-members** — `api/src/handlers/workspace-members.ts`
- **workspaces** — `api/src/handlers/workspaces.ts`

## Screens (16)

_These pages already exist — edit the named file in place, never create a parallel one._

- **Landing** `/` → `app/src/pages/Landing.tsx`
- **Login** `/login` → `app/src/pages/Login.tsx`
- **Signup** `/signup` → `app/src/pages/Signup.tsx`
- **ForgotPassword** `/forgot-password` → `app/src/pages/ForgotPassword.tsx`
- **ResetPassword** `/reset-password` → `app/src/pages/ResetPassword.tsx`
- **Library** `/library` (auth) → `app/src/pages/Library.tsx`
- **RecordingDetail** `/recordings/:id` (auth) → `app/src/pages/RecordingDetail.tsx`
- **Record** `/record` (auth) → `app/src/pages/Record.tsx`
- **Shared** `/shared` (auth) → `app/src/pages/Shared.tsx`
- **Settings** `/settings` (auth) → `app/src/pages/Settings.tsx`
- **Analytics** `/analytics` (auth) → `app/src/pages/Analytics.tsx`
- **PublicShare** `/share/:token` → `app/src/pages/PublicShare.tsx`
- **Notifications** `/notifications` (auth) → `app/src/pages/Notifications.tsx`
- **Team** `/team` (auth) → `app/src/pages/Team.tsx`
- **Billing** `/billing` (auth) → `app/src/pages/Billing.tsx`
- **Profile** `/profile` (auth) → `app/src/pages/Profile.tsx`

## Subscription tiers

free / pro / team — gated by: maxComments, maxRecordings, maxViews, advancedFeatures, canExport, retentionDays

## Integrations (10 @molecule/* packages)

- **Database**: `@molecule/api-database-postgresql`
- **Domain resources**: `@molecule/api-resource-user`, `@molecule/api-resource-comment`, `@molecule/api-resource-reaction`
- **Email**: `@molecule/api-emails-mailgun`
- **Frontend / UI**: `@molecule/app-virtual-scroll`, `@molecule/app-data-table`
- **Other API**: `@molecule/api-reporting-database`
- **Search**: `@molecule/api-search-meilisearch`
- **Uploads & media**: `@molecule/api-uploads-s3`

## Required secrets

- DATABASE_URL — PostgreSQL connection string
- S3_BUCKET — S3 bucket for recordings
- MAILGUN_API_KEY — Mailgun API key for sharing notifications
