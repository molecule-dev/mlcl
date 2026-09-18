# Internal Knowledge Base

- **slug**: `internal-knowledge-base`
- **cluster**: business-saas
- **type**: full-stack
- **layout**: dashboard

Confluence-like knowledge base with articles, spaces, search, and permissions

> **This is a complete, working app, already built.** The data model, handlers, and screens below all exist on disk (paths shown). Treat this as the user's existing codebase: **adapt the listed files in place** for the request; do not recreate tables, handlers, or pages that already exist, and do not add packages for functionality already implemented here.

## Features

`auth`, `search`, `articles`, `spaces`, `permissions`, `bookmarks`, `comments`

## Data model (14 domain tables)

_Already created by the existing SQL in `api/migrations/` — do NOT add new migrations for these tables._

- **ai_summaries** — id, article_id, summary_md, model, generated_at
- **article_versions** — id, article_id, edited_by_user_id, body_md, body_html, change_summary, edited_at
- **articles** — id, space_id, parent_article_id, author_user_id, last_edited_by_user_id, title, slug, body_md, body_html, status, position, helpful_count, …
- **attachments** — id, article_id, uploaded_by_user_id, s3_key, filename, content_type, size_bytes, uploaded_at
- **bookmarks** — id, userId, resourceType, resourceId, folder, createdAt, updatedAt
- **comments** — id, resourceType, resourceId, userId, parentId, body, editedAt, createdAt, updatedAt
- **devices** — id, createdAt, updatedAt, userId, name, pushPlatform, pushSubscription, hasPushSubscription
- **notifications** — id, user_id, kind, payload, read_at, created_at
- **reactions** — id, resourceType, resourceId, userId, type, createdAt, updatedAt
- **resource_tags** — id, tagId, resourceType, resourceId, createdAt
- **space_members** — id, space_id, user_id, role, added_at
- **spaces** — id, created_by_user_id, key, name, description, icon, color, archived_at, created_at, updated_at
- **tags** — id, name, slug, color, description, createdAt, updatedAt
- **payments** — id, createdAt, updatedAt, userId, transactionId, productId, platformKey, data, receipt

## API surface (handlers)

_These endpoints already exist — open and extend the named file, never recreate it._

- **ai-summaries** — `api/src/handlers/ai-summaries.ts`
- **article-versions** — `api/src/handlers/article-versions.ts`
- **articles** — `api/src/handlers/articles.ts`
- **attachments** — `api/src/handlers/attachments.ts`
- **bookmarks** — `api/src/handlers/bookmarks.ts`
- **notifications** — `api/src/handlers/notifications.ts`
- **space-members** — `api/src/handlers/space-members.ts`
- **spaces** — `api/src/handlers/spaces.ts`
- **users-2fa** — `api/src/handlers/users-2fa.ts`

## Screens (16)

_These pages already exist — edit the named file in place, never create a parallel one._

- **Login** `/login` → `app/src/pages/Login.tsx`
- **Signup** `/signup` → `app/src/pages/Signup.tsx`
- **ForgotPassword** `/forgot-password` → `app/src/pages/ForgotPassword.tsx`
- **ResetPassword** `/reset-password` → `app/src/pages/ResetPassword.tsx`
- **Home** `/home` (auth) → `app/src/pages/Home.tsx`
- **SpacesIndex** `/spaces` (auth) → `app/src/pages/SpacesIndex.tsx`
- **SpaceHome** `/spaces/:key` (auth) → `app/src/pages/SpaceHome.tsx`
- **ArticleView** `/article/:id` (auth) → `app/src/pages/ArticleView.tsx`
- **ArticleEditor** `/article/:id/edit` (auth) → `app/src/pages/ArticleEditor.tsx`
- **SearchResults** `/search` (auth) → `app/src/pages/SearchResults.tsx`
- **Settings** `/settings` (auth) → `app/src/pages/Settings.tsx`
- **Landing** `/` → `app/src/pages/Landing.tsx`
- **Drafts** `/drafts` (auth) → `app/src/pages/Drafts.tsx`
- **Bookmarks** `/bookmarks` (auth) → `app/src/pages/Bookmarks.tsx`
- **Notifications** `/notifications` (auth) → `app/src/pages/Notifications.tsx`
- **Profile** `/profile` (auth) → `app/src/pages/Profile.tsx`

## Subscription tiers

free / pro / team — gated by: maxArticles, maxSpaces, advancedFeatures, canExport, retentionDays

## Integrations (15 @molecule/* packages)

- **AI**: `@molecule/api-ai-summarization`
- **Auth & permissions**: `@molecule/api-permissions-custom`
- **Database**: `@molecule/api-database-postgresql`
- **Domain resources**: `@molecule/api-resource-user`, `@molecule/api-resource-comment`, `@molecule/api-resource-tag`, `@molecule/api-resource-reaction`, `@molecule/api-resource-bookmark`
- **Frontend / UI**: `@molecule/app-markdown`, `@molecule/app-tree-view`, `@molecule/app-data-table`, `@molecule/app-command-palette`, `@molecule/app-keyboard-shortcuts`
- **Search**: `@molecule/api-search-meilisearch`
- **Uploads & media**: `@molecule/api-uploads-s3`

## Required secrets

- DATABASE_URL — PostgreSQL connection string
- MEILISEARCH_API_KEY — MeiliSearch API key
- S3_BUCKET — S3 bucket for attachments
