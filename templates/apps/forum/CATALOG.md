# Forum / Community

- **slug**: `forum`
- **cluster**: content-social
- **type**: full-stack
- **layout**: dashboard

Reddit-like discussions with threads, voting, reputation, and moderation — with built-in Stripe-backed subscription tiers

> **This is a complete, working app, already built.** The data model, handlers, and screens below all exist on disk (paths shown). Treat this as the user's existing codebase: **adapt the listed files in place** for the request; do not recreate tables, handlers, or pages that already exist, and do not add packages for functionality already implemented here.

## Features

`auth`, `search`, `voting`, `reputation`, `moderation`, `threads`, `categories`, `subscriptions`

## Data model (15 domain tables)

_Already created by the existing SQL in `api/migrations/` — do NOT add new migrations for these tables._

- **activities** — id, actorId, action, resourceType, resourceId, metadata, createdAt
- **activity_seen_status** — userId, lastSeenActivityId, updatedAt
- **bookmarks** — id, userId, resourceType, resourceId, folder, createdAt, updatedAt
- **comments** — id, resourceType, resourceId, userId, parentId, body, editedAt, createdAt, updatedAt
- **devices** — id, createdAt, updatedAt, userId, name, pushPlatform, pushSubscription, hasPushSubscription
- **follows** — id, followerId, targetType, targetId, createdAt, updatedAt
- **forum_categories** — id, slug, name, description, color, icon, sort_order, thread_count, subscriber_count, created_at, updated_at, updatedAt
- **moderation_reports** — id, target_type, target_id, reporter_id, user_id, reason, description, status, action, moderator_id, resolver_id, resolved_at, …
- **reactions** — id, resourceType, resourceId, userId, type, createdAt, updatedAt
- **replies** — id, thread_id, parent_reply_id, author_id, user_id, body, body_markdown, vote_score, edited_at, created_at, updated_at, updatedAt
- **resource_tags** — id, tagId, resourceType, resourceId, createdAt
- **tags** — id, name, slug, color, description, createdAt, updatedAt
- **threads** — id, slug, title, body, body_markdown, category_id, author_id, user_id, tags, vote_score, reply_count, view_count, …
- **votes** — id, target_type, target_id, user_id, direction, created_at, updated_at, updatedAt
- **payments** — id, createdAt, updatedAt, userId, transactionId, productId, platformKey, data, receipt

## API surface (handlers)

_These endpoints already exist — open and extend the named file, never recreate it._

- **bookmarks** — `api/src/handlers/bookmarks.ts`
- **categories** — `api/src/handlers/categories.ts`
- **moderation** — `api/src/handlers/moderation.ts`
- **notifications** — `api/src/handlers/notifications.ts`
- **profiles** — `api/src/handlers/profiles.ts`
- **threads** — `api/src/handlers/threads.ts`
- **votes** — `api/src/handlers/votes.ts`

## Screens (15)

_These pages already exist — edit the named file in place, never create a parallel one._

- **Landing** `/` → `app/src/pages/Landing.tsx`
- **Login** `/login` → `app/src/pages/Login.tsx`
- **Signup** `/signup` → `app/src/pages/Signup.tsx`
- **ForgotPassword** `/forgot-password` → `app/src/pages/ForgotPassword.tsx`
- **ResetPassword** `/reset-password` → `app/src/pages/ResetPassword.tsx`
- **Feed** `/feed` (auth) → `app/src/pages/Feed.tsx`
- **Categories** `/categories` (auth) → `app/src/pages/Categories.tsx`
- **ThreadView** `/thread/:id` (auth) → `app/src/pages/ThreadView.tsx`
- **Compose** `/compose` (auth) → `app/src/pages/Compose.tsx`
- **Profile** `/u/:username` (auth) → `app/src/pages/Profile.tsx`
- **Settings** `/settings` (auth) → `app/src/pages/Settings.tsx`
- **CategoryDetail** `/c/:slug` (auth) → `app/src/pages/CategoryDetail.tsx`
- **Search** `/search` (auth) → `app/src/pages/Search.tsx`
- **Notifications** `/notifications` (auth) → `app/src/pages/Notifications.tsx`
- **ModQueue** `/mod` (auth) → `app/src/pages/ModQueue.tsx`

## Subscription tiers

free / pro / team — gated by: maxCategories, maxModeration, maxThreads, maxVotes, advancedFeatures, canExport, retentionDays

## Integrations (20 @molecule/* packages)

- **Auth & permissions**: `@molecule/api-permissions-custom`
- **Database**: `@molecule/api-database-postgresql`
- **Domain resources**: `@molecule/api-resource-user`, `@molecule/api-resource-comment`, `@molecule/api-resource-reaction`, `@molecule/api-resource-tag`, `@molecule/api-resource-bookmark`, `@molecule/api-resource-follow`, `@molecule/api-resource-activity-feed`, `@molecule/api-resource-payment`
- **Email**: `@molecule/api-email-templates`, `@molecule/api-emails-mailgun`
- **Frontend / UI**: `@molecule/app-markdown`, `@molecule/app-virtual-scroll`, `@molecule/app-data-table`
- **Other API**: `@molecule/api-content-moderation`
- **Payments & billing**: `@molecule/api-payments-stripe`, `@molecule/api-entitlements`, `@molecule/app-billing-react`
- **Search**: `@molecule/api-search-meilisearch`

## Required secrets

- DATABASE_URL — PostgreSQL connection string
- MEILISEARCH_API_KEY — MeiliSearch API key
- STRIPE_SECRET_KEY — Stripe secret API key (sk_test_... in test mode)
- STRIPE_WEBHOOK_SECRET — Stripe webhook signing secret (whsec_...)
