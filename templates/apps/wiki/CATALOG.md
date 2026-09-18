# Wiki / Knowledge Base

- **slug**: `wiki`
- **cluster**: content-social
- **type**: full-stack
- **layout**: dashboard

Notion wiki-like with versioned pages, linking, and permissions

> **This is a complete, working app, already built.** The data model, handlers, and screens below all exist on disk (paths shown). Treat this as the user's existing codebase: **adapt the listed files in place** for the request; do not recreate tables, handlers, or pages that already exist, and do not add packages for functionality already implemented here.

## Features

`auth`, `search`, `versioning`, `page-tree`, `permissions`, `markdown`, `ai-summary`

## Data model (12 domain tables)

_Already created by the existing SQL in `api/migrations/` — do NOT add new migrations for these tables._

- **comments** — id, resourceType, resourceId, userId, parentId, body, editedAt, createdAt, updatedAt
- **devices** — id, createdAt, updatedAt, userId, name, pushPlatform, pushSubscription, hasPushSubscription
- **resource_tags** — id, tagId, resourceType, resourceId, createdAt
- **tags** — id, name, slug, color, description, createdAt, updatedAt
- **wiki_page_versions** — id, page_id, title, content, version, change_summary, editor_id, created_at
- **wiki_pages** — id, space_id, parent_id, title, slug, content, summary, is_template, position, trashed_at, tags, author_id, …
- **wiki_space_members** — id, space_id, user_id, role, invited_by, accepted_at, created_at
- **wiki_spaces** — id, owner_id, name, slug, description, icon, color, visibility, is_public, page_count, created_at, updatedAt
- **wiki_notifications** — id, user_id, kind, title, body, page_id, actor_id, read_at, created_at
- **wiki_audit_log** — id, space_id, actor_id, target_user_id, action, metadata, created_at
- **wiki_user_prefs** — user_id, workspace_name, subdomain, default_landing, theme, locale, notify_mentions, notify_replies, notify_assignments, updated_at
- **payments** — id, createdAt, updatedAt, userId, transactionId, productId, platformKey, data, receipt

## API surface (handlers)

_These endpoints already exist — open and extend the named file, never recreate it._

- **me** — `api/src/handlers/me.ts`
- **notifications** — `api/src/handlers/notifications.ts`
- **pages** — `api/src/handlers/pages.ts`
- **prefs** — `api/src/handlers/prefs.ts`
- **spaces** — `api/src/handlers/spaces.ts`

## Screens (18)

_These pages already exist — edit the named file in place, never create a parallel one._

- **Landing** `/` → `app/src/pages/Landing.tsx`
- **Login** `/login` → `app/src/pages/Login.tsx`
- **Signup** `/signup` → `app/src/pages/Signup.tsx`
- **ForgotPassword** `/forgot-password` → `app/src/pages/ForgotPassword.tsx`
- **ResetPassword** `/reset-password` → `app/src/pages/ResetPassword.tsx`
- **Home** `/home` (auth) → `app/src/pages/Home.tsx`
- **PageView** `/page/:id` (auth) → `app/src/pages/PageView.tsx`
- **PageEditor** `/page/:id/edit` (auth) → `app/src/pages/PageEditor.tsx`
- **Search** `/search` (auth) → `app/src/pages/Search.tsx`
- **VersionHistory** `/page/:id/history` (auth) → `app/src/pages/VersionHistory.tsx`
- **Settings** `/settings` (auth) → `app/src/pages/Settings.tsx`
- **Spaces** `/spaces` (auth) → `app/src/pages/Spaces.tsx`
- **Templates** `/templates` (auth) → `app/src/pages/Templates.tsx`
- **Notifications** `/notifications` (auth) → `app/src/pages/Notifications.tsx`
- **Comments** `/comments` (auth) → `app/src/pages/Comments.tsx`
- **TeamMembers** `/team` (auth) → `app/src/pages/TeamMembers.tsx`
- **Trash** `/trash` (auth) → `app/src/pages/Trash.tsx`
- **Profile** `/profile/:id` (auth) → `app/src/pages/Profile.tsx`

## Subscription tiers

free / pro / team — gated by: maxPages, maxSpaces, advancedFeatures, canExport, retentionDays

## Integrations (9 @molecule/* packages)

- **AI**: `@molecule/api-ai-summarization`
- **Auth & permissions**: `@molecule/api-permissions-custom`
- **Database**: `@molecule/api-database-postgresql`
- **Domain resources**: `@molecule/api-resource-user`, `@molecule/api-resource-comment`, `@molecule/api-resource-tag`
- **Frontend / UI**: `@molecule/app-markdown`, `@molecule/app-tree-view`
- **Search**: `@molecule/api-search-meilisearch`

## Required secrets

- DATABASE_URL — PostgreSQL connection string
- MEILISEARCH_API_KEY — MeiliSearch API key
