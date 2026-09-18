# Link Aggregator

- **slug**: `link-aggregator`
- **cluster**: content-social
- **type**: full-stack
- **layout**: dashboard

HN/Pinboard-like with link submission, voting, and karma

> **This is a complete, working app, already built.** The data model, handlers, and screens below all exist on disk (paths shown). Treat this as the user's existing codebase: **adapt the listed files in place** for the request; do not recreate tables, handlers, or pages that already exist, and do not add packages for functionality already implemented here.

## Features

`auth`, `search`, `voting`, `karma`, `comments`, `tags`, `bookmarks`

## Data model (13 domain tables)

_Already created by the existing SQL in `api/migrations/` — do NOT add new migrations for these tables._

- **bookmarks** — id, userId, resourceType, resourceId, folder, createdAt, updatedAt
- **comments** — id, resourceType, resourceId, userId, parentId, body, editedAt, createdAt, updatedAt
- **devices** — id, createdAt, updatedAt, userId, name, pushPlatform, pushSubscription, hasPushSubscription
- **link_comments** — id, link_id, parent_id, body, author_id, user_id, points, edited_at, created_at, updated_at, updatedAt
- **links** — id, title, url, text, domain, sub_id, sub_slug, sub_name, submitter_id, submitter_name, user_id, tags, …
- **notifications** — id, user_id, kind, actor_id, link_id, comment_id, payload, read_at, created_at, updated_at, updatedAt
- **reactions** — id, resourceType, resourceId, userId, type, createdAt, updatedAt
- **resource_tags** — id, tagId, resourceType, resourceId, createdAt
- **sub_memberships** — id, sub_id, user_id, joined_at, created_at, updated_at, updatedAt
- **subs** — id, name, slug, description, owner_id, user_id, member_count, created_at, updated_at, updatedAt
- **tags** — id, name, slug, color, description, createdAt, updatedAt
- **votes** — id, link_id, user_id, direction, created_at, updated_at, updatedAt
- **comment_votes** — id, comment_id, user_id, direction, created_at, updated_at, updatedAt

## API surface (handlers)

_These endpoints already exist — open and extend the named file, never recreate it._

- **bookmarks** — `api/src/handlers/bookmarks.ts`
- **comments** — `api/src/handlers/comments.ts`
- **links** — `api/src/handlers/links.ts`
- **notifications** — `api/src/handlers/notifications.ts`
- **subs** — `api/src/handlers/subs.ts`
- **users** — `api/src/handlers/users.ts`
- **votes** — `api/src/handlers/votes.ts`

## Screens (15)

_These pages already exist — edit the named file in place, never create a parallel one._

- **Landing** `/` → `app/src/pages/Landing.tsx`
- **Login** `/login` → `app/src/pages/Login.tsx`
- **Signup** `/signup` → `app/src/pages/Signup.tsx`
- **ForgotPassword** `/forgot-password` → `app/src/pages/ForgotPassword.tsx`
- **ResetPassword** `/reset-password` → `app/src/pages/ResetPassword.tsx`
- **Feed** `/feed` (auth) → `app/src/pages/Feed.tsx`
- **LinkDetail** `/links/:id` (auth) → `app/src/pages/LinkDetail.tsx`
- **Subs** `/subs` (auth) → `app/src/pages/Subs.tsx`
- **SubDetail** `/subs/:slug` (auth) → `app/src/pages/SubDetail.tsx`
- **SubmitLink** `/submit` (auth) → `app/src/pages/SubmitLink.tsx`
- **Profile** `/users/:id` (auth) → `app/src/pages/Profile.tsx`
- **Settings** `/settings` (auth) → `app/src/pages/Settings.tsx`
- **Notifications** `/notifications` (auth) → `app/src/pages/Notifications.tsx`
- **Search** `/search` (auth) → `app/src/pages/Search.tsx`
- **Saved** `/saved` (auth) → `app/src/pages/Saved.tsx`

## Subscription tiers

free / pro / team — gated by: maxComments, maxLinks, maxVotes, advancedFeatures, canExport, retentionDays

## Integrations (8 @molecule/* packages)

- **Database**: `@molecule/api-database-postgresql`
- **Domain resources**: `@molecule/api-resource-user`, `@molecule/api-resource-comment`, `@molecule/api-resource-reaction`, `@molecule/api-resource-tag`, `@molecule/api-resource-bookmark`
- **Frontend / UI**: `@molecule/app-virtual-scroll`
- **Search**: `@molecule/api-search-meilisearch`

## Required secrets

- DATABASE_URL — PostgreSQL connection string
- MEILISEARCH_API_KEY — MeiliSearch API key
