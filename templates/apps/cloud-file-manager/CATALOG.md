# Cloud File Manager

- **slug**: `cloud-file-manager`
- **cluster**: productivity
- **type**: full-stack
- **layout**: dashboard

Dropbox-like file storage with upload, folders, sharing, and preview

> **This is a complete, working app, already built.** The data model, handlers, and screens below all exist on disk (paths shown). Treat this as the user's existing codebase: **adapt the listed files in place** for the request; do not recreate tables, handlers, or pages that already exist, and do not add packages for functionality already implemented here.

## Features

`auth`, `search`, `upload`, `folders`, `sharing`, `preview`

## Data model (7 domain tables)

_Already created by the existing SQL in `api/migrations/` — do NOT add new migrations for these tables._

- **devices** — id, createdAt, updatedAt, userId, name, pushPlatform, pushSubscription, hasPushSubscription
- **file_shares** — id, file_id, token, permission, created_by, expires_at, created_at
- **files** — id, owner_id, folder_id, name, storage_key, mime_type, size, is_starred, is_trashed, trashed_at, version, created_at, …
- **folders** — id, owner_id, parent_id, name, color, created_at, updated_at
- **payments** — id, createdAt, updatedAt, userId, transactionId, productId, platformKey, data, receipt
- **resource_tags** — id, tagId, resourceType, resourceId, createdAt
- **tags** — id, name, slug, color, description, createdAt, updatedAt

## API surface (handlers)

_These endpoints already exist — open and extend the named file, never recreate it._

- **activity** — `api/src/handlers/activity.ts`
- **files** — `api/src/handlers/files.ts`
- **folders** — `api/src/handlers/folders.ts`
- **shares** — `api/src/handlers/shares.ts`
- **stats** — `api/src/handlers/stats.ts`
- **storage** — `api/src/handlers/storage.ts`
- **uploads** — `api/src/handlers/uploads.ts`

## Screens (15)

_These pages already exist — edit the named file in place, never create a parallel one._

- **Landing** `/` → `app/src/pages/Landing.tsx`
- **Login** `/login` → `app/src/pages/Login.tsx`
- **Signup** `/signup` → `app/src/pages/Signup.tsx`
- **ForgotPassword** `/forgot-password` → `app/src/pages/ForgotPassword.tsx`
- **ResetPassword** `/reset-password` → `app/src/pages/ResetPassword.tsx`
- **MyFiles** `/files` (auth) → `app/src/pages/MyFiles.tsx`
- **FileDetail** `/files/:id` (auth) → `app/src/pages/FileDetail.tsx`
- **SharedWithMe** `/shared` (auth) → `app/src/pages/SharedWithMe.tsx`
- **Starred** `/starred` (auth) → `app/src/pages/Starred.tsx`
- **Trash** `/trash` (auth) → `app/src/pages/Trash.tsx`
- **Upload** `/upload` (auth) → `app/src/pages/Upload.tsx`
- **Settings** `/settings` (auth) → `app/src/pages/Settings.tsx`
- **Recent** `/recent` (auth) → `app/src/pages/Recent.tsx`
- **SearchResults** `/search` (auth) → `app/src/pages/SearchResults.tsx`
- **Storage** `/storage` (auth) → `app/src/pages/Storage.tsx`

## Subscription tiers

free / pro / team — gated by: maxFiles, maxFolders, maxShares, advancedFeatures, canExport, retentionDays

## Integrations (12 @molecule/* packages)

- **Auth & permissions**: `@molecule/api-permissions-custom`
- **Database**: `@molecule/api-database-postgresql`
- **Domain resources**: `@molecule/api-resource-user`, `@molecule/api-resource-tag`
- **Frontend / UI**: `@molecule/app-file-upload-filepond`, `@molecule/app-virtual-scroll-tanstack`, `@molecule/app-keyboard-shortcuts-hotkeys`, `@molecule/app-command-palette-cmdk`, `@molecule/app-drag-drop-dndkit`
- **Search**: `@molecule/api-search-meilisearch`
- **Uploads & media**: `@molecule/api-uploads-s3`, `@molecule/api-image-sharp`

## Required secrets

- DATABASE_URL — PostgreSQL connection string
- S3_BUCKET — S3 bucket for file storage
- MEILISEARCH_API_KEY — MeiliSearch API key
