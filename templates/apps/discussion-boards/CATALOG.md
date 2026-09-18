# Discussion Boards

- **slug**: `discussion-boards`
- **cluster**: communication
- **type**: full-stack
- **layout**: dashboard

Discourse-like forums with categories, threads, moderation, markdown, and user reputation

> **This is a complete, working app, already built.** The data model, handlers, and screens below all exist on disk (paths shown). Treat this as the user's existing codebase: **adapt the listed files in place** for the request; do not recreate tables, handlers, or pages that already exist, and do not add packages for functionality already implemented here.

## Features

`auth`, `search`, `moderation`, `markdown`, `categories`, `reputation`

## Data model (13 domain tables)

_Already created by the existing SQL in `api/migrations/` — do NOT add new migrations for these tables._

- **activities** — id, actorId, action, resourceType, resourceId, metadata, createdAt
- **activity_seen_status** — userId, lastSeenActivityId, updatedAt
- **bookmarks** — id, user_id, target_type, target_id, created_at, updated_at, updatedAt
- **categories** — id, slug, name, description, color, icon, sort_order, thread_count, parent_id, created_at, updated_at, updatedAt
- **comments** — id, resourceType, resourceId, userId, parentId, body, editedAt, createdAt, updatedAt
- **devices** — id, createdAt, updatedAt, userId, name, pushPlatform, pushSubscription, hasPushSubscription
- **follows** — id, followerId, targetType, targetId, createdAt, updatedAt
- **moderation_reports** — id, target_type, target_id, reporter_id, user_id, reason, description, status, resolver_id, resolved_at, created_at, updated_at, …
- **posts** — id, topic_id, author_id, user_id, body_markdown, parent_post_id, is_solution, edited_at, created_at, updated_at, updatedAt
- **reactions** — id, resourceType, resourceId, userId, type, createdAt, updatedAt
- **resource_tags** — id, tagId, resourceType, resourceId, createdAt
- **tags** — id, name, slug, color, description, createdAt, updatedAt
- **topics** — id, slug, title, body_markdown, category_id, author_id, user_id, status, is_pinned, view_count, post_count, last_reply_at, …

## API surface (handlers)

_These endpoints already exist — open and extend the named file, never recreate it._

- **aliases** — `api/src/handlers/aliases.ts`
- **bookmarks** — `api/src/handlers/bookmarks.ts`
- **categories** — `api/src/handlers/categories.ts`
- **moderation** — `api/src/handlers/moderation.ts`
- **notifications** — `api/src/handlers/notifications.ts`
- **posts** — `api/src/handlers/posts.ts`
- **topics** — `api/src/handlers/topics.ts`
- **users-2fa** — `api/src/handlers/users-2fa.ts`

## Screens (15)

_These pages already exist — edit the named file in place, never create a parallel one._

- **Landing** `/` → `app/src/pages/Landing.tsx`
- **Login** `/login` → `app/src/pages/Login.tsx`
- **Signup** `/signup` → `app/src/pages/Signup.tsx`
- **ForgotPassword** `/forgot-password` → `app/src/pages/ForgotPassword.tsx`
- **ResetPassword** `/reset-password` → `app/src/pages/ResetPassword.tsx`
- **CategoriesList** `/c` (auth) → `app/src/pages/CategoriesList.tsx`
- **CategoryDetail** `/c/:slug` (auth) → `app/src/pages/CategoryDetail.tsx`
- **ThreadView** `/t/:id` (auth) → `app/src/pages/ThreadView.tsx`
- **Compose** `/compose` (auth) → `app/src/pages/Compose.tsx`
- **UserProfile** `/u/:username` (auth) → `app/src/pages/UserProfile.tsx`
- **Settings** `/settings` (auth) → `app/src/pages/Settings.tsx`
- **Search** `/search` (auth) → `app/src/pages/Search.tsx`
- **Notifications** `/notifications` (auth) → `app/src/pages/Notifications.tsx`
- **Bookmarks** `/bookmarks` (auth) → `app/src/pages/Bookmarks.tsx`
- **ModerationQueue** `/moderation` (auth) → `app/src/pages/ModerationQueue.tsx`

## Subscription tiers

free / pro / team — gated by: maxCategories, maxPosts, maxTopics, advancedFeatures, canExport, retentionDays

## Integrations (15 @molecule/* packages)

- **Auth & permissions**: `@molecule/api-permissions-custom`
- **Database**: `@molecule/api-database-postgresql`
- **Domain resources**: `@molecule/api-resource-user`, `@molecule/api-resource-comment`, `@molecule/api-resource-reaction`, `@molecule/api-resource-tag`, `@molecule/api-resource-follow`, `@molecule/api-resource-activity-feed`
- **Email**: `@molecule/api-emails-mailgun`
- **Frontend / UI**: `@molecule/app-markdown`, `@molecule/app-virtual-scroll`, `@molecule/app-data-table`, `@molecule/app-command-palette`
- **Other API**: `@molecule/api-content-moderation`
- **Search**: `@molecule/api-search-meilisearch`

## Required secrets

- DATABASE_URL — PostgreSQL connection string
- MAILGUN_API_KEY — Mailgun API key for notifications
