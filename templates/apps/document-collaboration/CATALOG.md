# Document Collaboration

- **slug**: `document-collaboration`
- **cluster**: communication
- **type**: full-stack
- **layout**: dashboard

Google Docs-like real-time document editing with comments, version history, and sharing

> **This is a complete, working app, already built.** The data model, handlers, and screens below all exist on disk (paths shown). Treat this as the user's existing codebase: **adapt the listed files in place** for the request; do not recreate tables, handlers, or pages that already exist, and do not add packages for functionality already implemented here.

## Features

`auth`, `realtime`, `search`, `comments`, `versioning`, `sharing`

## Data model (11 domain tables)

_Already created by the existing SQL in `api/migrations/` — do NOT add new migrations for these tables._

- **activities** — id, actorId, action, resourceType, resourceId, metadata, createdAt
- **activity_seen_status** — userId, lastSeenActivityId, updatedAt
- **comments** — id, resourceType, resourceId, userId, parentId, body, editedAt, createdAt, updatedAt
- **devices** — id, createdAt, updatedAt, userId, name, pushPlatform, pushSubscription, hasPushSubscription
- **document_comments** — id, document_id, author_id, parent_id, body, anchor, is_resolved, resolved_by, resolved_at, created_at, updated_at
- **document_shares** — id, document_id, shared_by, shared_with_user_id, email, role, accepted_at, created_at, updated_at
- **document_templates** — id, owner_id, name, description, category, content, is_system, created_at, updated_at
- **document_versions** — id, document_id, author_id, content, version, change_summary, created_at
- **documents** — id, owner_id, template_id, title, content, status, is_template, version, trashed_at, created_at, updated_at
- **payments** — id, createdAt, updatedAt, userId, transactionId, productId, platformKey, data, receipt
- **notifications** — id, user_id, type, actor, description, href, unread, created_at

## API surface (handlers)

_These endpoints already exist — open and extend the named file, never recreate it._

- **\_seed** — `api/src/handlers/_seed.ts`
- **comments** — `api/src/handlers/comments.ts`
- **documents** — `api/src/handlers/documents.ts`
- **notifications** — `api/src/handlers/notifications.ts`
- **profile** — `api/src/handlers/profile.ts`
- **sharing** — `api/src/handlers/sharing.ts`
- **templates** — `api/src/handlers/templates.ts`
- **versions** — `api/src/handlers/versions.ts`

## Screens (15)

_These pages already exist — edit the named file in place, never create a parallel one._

- **Landing** `/` → `app/src/pages/Landing.tsx`
- **Login** `/login` → `app/src/pages/Login.tsx`
- **Signup** `/signup` → `app/src/pages/Signup.tsx`
- **ForgotPassword** `/forgot-password` → `app/src/pages/ForgotPassword.tsx`
- **ResetPassword** `/reset-password` → `app/src/pages/ResetPassword.tsx`
- **Dashboard** `/dashboard` (auth) → `app/src/pages/Dashboard.tsx`
- **Editor** `/doc/:id` (auth) → `app/src/pages/Editor.tsx`
- **VersionHistory** `/doc/:id/history` (auth) → `app/src/pages/VersionHistory.tsx`
- **Comments** `/doc/:id/comments` (auth) → `app/src/pages/Comments.tsx`
- **Shared** `/shared` (auth) → `app/src/pages/Shared.tsx`
- **Settings** `/settings` (auth) → `app/src/pages/Settings.tsx`
- **Notifications** `/notifications` (auth) → `app/src/pages/Notifications.tsx`
- **Templates** `/templates` (auth) → `app/src/pages/Templates.tsx`
- **Trash** `/trash` (auth) → `app/src/pages/Trash.tsx`
- **Profile** `/profile` (auth) → `app/src/pages/Profile.tsx`

## Subscription tiers

free / pro / team — gated by: maxComments, maxDocuments, maxSharing, maxVersions, advancedFeatures, canExport, retentionDays

## Integrations (14 @molecule/* packages)

- **Auth & permissions**: `@molecule/api-permissions-custom`
- **Database**: `@molecule/api-database-postgresql`
- **Domain resources**: `@molecule/api-resource-user`, `@molecule/api-resource-comment`, `@molecule/api-resource-activity-feed`
- **Email**: `@molecule/api-emails-mailgun`
- **Frontend / UI**: `@molecule/app-markdown`, `@molecule/app-virtual-scroll`, `@molecule/app-command-palette`, `@molecule/app-keyboard-shortcuts`
- **Realtime**: `@molecule/api-realtime-socketio`, `@molecule/app-realtime-socketio`
- **Search**: `@molecule/api-search-meilisearch`
- **Uploads & media**: `@molecule/api-uploads-s3`

## Required secrets

- DATABASE_URL — PostgreSQL connection string
- S3_BUCKET — S3 bucket for document assets
- MAILGUN_API_KEY — Mailgun API key for sharing invites
