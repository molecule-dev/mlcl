# Writing Tool

- **slug**: `writing-tool`
- **cluster**: creative-tools
- **type**: full-stack
- **layout**: dashboard

iA Writer-like distraction-free writing with markdown, focus mode, and document management

> **This is a complete, working app, already built.** The data model, handlers, and screens below all exist on disk (paths shown). Treat this as the user's existing codebase: **adapt the listed files in place** for the request; do not recreate tables, handlers, or pages that already exist, and do not add packages for functionality already implemented here.

## Features

`auth`, `markdown`, `focus-mode`, `search`, `tags`, `export`

## Data model (7 domain tables)

_Already created by the existing SQL in `api/migrations/` — do NOT add new migrations for these tables._

- **devices** — id, createdAt, updatedAt, userId, name, pushPlatform, pushSubscription, hasPushSubscription
- **document_exports** — id, document_id, format, status, s3_key, created_at
- **document_versions** — id, document_id, version_number, body_md, snapshot_size, created_at
- **documents** — id, owner_id, folder_id, title, body_md, excerpt, word_count, character_count, reading_time, status, pinned, tags_json, …
- **folders** — id, owner_id, parent_id, name, position, created_at, updated_at
- **resource_tags** — id, tagId, resourceType, resourceId, createdAt
- **tags** — id, name, slug, color, description, createdAt, updatedAt

## API surface (handlers)

_These endpoints already exist — open and extend the named file, never recreate it._

- **documents** — `api/src/handlers/documents.ts`
- **exports** — `api/src/handlers/exports.ts`
- **folders** — `api/src/handlers/folders.ts`

## Screens (12)

_These pages already exist — edit the named file in place, never create a parallel one._

- **Landing** `/` → `app/src/pages/Landing.tsx`
- **Login** `/login` → `app/src/pages/Login.tsx`
- **Signup** `/signup` → `app/src/pages/Signup.tsx`
- **ForgotPassword** `/forgot-password` → `app/src/pages/ForgotPassword.tsx`
- **ResetPassword** `/reset-password` → `app/src/pages/ResetPassword.tsx`
- **Library** `/library` (auth) → `app/src/pages/Library.tsx`
- **Editor** `/editor/:id` (auth) → `app/src/pages/Editor.tsx`
- **FocusMode** `/editor/:id/focus` (auth) → `app/src/pages/FocusMode.tsx`
- **Stats** `/stats` (auth) → `app/src/pages/Stats.tsx`
- **Settings** `/settings` (auth) → `app/src/pages/Settings.tsx`
- **VersionHistory** `/editor/:id/history` (auth) → `app/src/pages/VersionHistory.tsx`
- **Billing** `/billing` (auth) → `app/src/pages/Billing.tsx`

## Subscription tiers

free / pro / team — gated by: maxDocuments, maxExports, maxFolders, advancedFeatures, canExport, retentionDays

## Integrations (11 @molecule/* packages)

- **AI**: `@molecule/api-ai-summarization`
- **Database**: `@molecule/api-database-postgresql`
- **Domain resources**: `@molecule/api-resource-user`, `@molecule/api-resource-tag`
- **Frontend / UI**: `@molecule/app-markdown`, `@molecule/app-keyboard-shortcuts`, `@molecule/app-command-palette`, `@molecule/app-data-table`, `@molecule/app-virtual-scroll`
- **Search**: `@molecule/api-search-meilisearch`
- **Uploads & media**: `@molecule/api-uploads-s3`

## Required secrets

- DATABASE_URL — PostgreSQL connection string
- S3_BUCKET — S3 bucket for file attachments
