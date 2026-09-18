# Internal Announcements

- **slug**: `internal-announcements`
- **cluster**: communication
- **type**: full-stack
- **layout**: dashboard

Company town hall with announcements, acknowledgments, comments, and threading

> **This is a complete, working app, already built.** The data model, handlers, and screens below all exist on disk (paths shown). Treat this as the user's existing codebase: **adapt the listed files in place** for the request; do not recreate tables, handlers, or pages that already exist, and do not add packages for functionality already implemented here.

## Features

`auth`, `search`, `notifications`, `acknowledgments`, `comments`

## Data model (13 domain tables)

_Already created by the existing SQL in `api/migrations/` — do NOT add new migrations for these tables._

- **acknowledgments** — id, announcement_id, user_id, acknowledged_at, ip, created_at, updated_at
- **announcement_audiences** — id, announcement_id, kind, target_id, created_at
- **announcement_categories** — id, name, color, icon, created_by, user_id, created_at, updated_at
- **announcement_comments** — id, announcement_id, parent_id, author_id, user_id, body, edited_at, created_at, updated_at
- **announcements** — id, title, body, body_html, category_id, author_id, user_id, audience, priority, status, is_pinned, requires_acknowledgment, …
- **comments** — id, resourceType, resourceId, userId, parentId, body, editedAt, createdAt, updatedAt
- **devices** — id, createdAt, updatedAt, userId, name, pushPlatform, pushSubscription, hasPushSubscription
- **notifications** — id, createdAt, updatedAt
- **reactions** — id, resourceType, resourceId, userId, type, createdAt, updatedAt
- **resource_tags** — id, tagId, resourceType, resourceId, createdAt
- **tags** — id, name, slug, color, description, createdAt, updatedAt
- **view_events** — id, announcement_id, user_id, viewed_at, created_at
- **payments** — id, createdAt, updatedAt, userId, transactionId, productId, platformKey, data, receipt

## API surface (handlers)

_These endpoints already exist — open and extend the named file, never recreate it._

- **announcements** — `api/src/handlers/announcements.ts`
- **categories** — `api/src/handlers/categories.ts`
- **comments** — `api/src/handlers/comments.ts`
- **team** — `api/src/handlers/team.ts`

## Screens (14)

_These pages already exist — edit the named file in place, never create a parallel one._

- **Login** `/login` → `app/src/pages/Login.tsx`
- **Signup** `/signup` → `app/src/pages/Signup.tsx`
- **ForgotPassword** `/forgot-password` → `app/src/pages/ForgotPassword.tsx`
- **ResetPassword** `/reset-password` → `app/src/pages/ResetPassword.tsx`
- **Feed** `/feed` (auth) → `app/src/pages/Feed.tsx`
- **AnnouncementDetail** `/announcement/:id` (auth) → `app/src/pages/AnnouncementDetail.tsx`
- **Composer** `/compose` (auth) → `app/src/pages/Composer.tsx`
- **MyAcknowledgments** `/my-acknowledgments` (auth) → `app/src/pages/MyAcknowledgments.tsx`
- **Analytics** `/analytics` (auth) → `app/src/pages/Analytics.tsx`
- **Settings** `/settings` (auth) → `app/src/pages/Settings.tsx`
- **Profile** `/profile` (auth) → `app/src/pages/Profile.tsx`
- **Notifications** `/notifications` (auth) → `app/src/pages/Notifications.tsx`
- **Search** `/search` (auth) → `app/src/pages/Search.tsx`
- **TeamDirectory** `/people` (auth) → `app/src/pages/TeamDirectory.tsx`

## Subscription tiers

free / pro / team — gated by: maxAnnouncements, maxCategories, maxComments, advancedFeatures, canExport, retentionDays

## Integrations (13 @molecule/* packages)

- **Auth & permissions**: `@molecule/api-permissions-custom`
- **Database**: `@molecule/api-database-postgresql`
- **Domain resources**: `@molecule/api-resource-user`, `@molecule/api-resource-comment`, `@molecule/api-resource-reaction`, `@molecule/api-resource-tag`, `@molecule/api-resource-notification`
- **Email**: `@molecule/api-emails-mailgun`
- **Frontend / UI**: `@molecule/app-markdown`, `@molecule/app-virtual-scroll`, `@molecule/app-data-table`
- **Notifications**: `@molecule/api-push-notifications-web-push`
- **Search**: `@molecule/api-search-meilisearch`

## Required secrets

- DATABASE_URL — PostgreSQL connection string
- MAILGUN_API_KEY — Mailgun API key for announcement notifications
