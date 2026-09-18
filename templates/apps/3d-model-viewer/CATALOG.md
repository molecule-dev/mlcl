# 3D Model Viewer

- **slug**: `3d-model-viewer`
- **cluster**: creative-tools
- **type**: full-stack
- **layout**: dashboard

Sketchfab-like 3D model viewer with WebGL, rotate, annotate, and embed

> **This is a complete, working app, already built.** The data model, handlers, and screens below all exist on disk (paths shown). Treat this as the user's existing codebase: **adapt the listed files in place** for the request; do not recreate tables, handlers, or pages that already exist, and do not add packages for functionality already implemented here.

## Features

`auth`, `webgl`, `annotations`, `embed`, `search`, `comments`

## Data model (9 domain tables)

_Already created by the existing SQL in `api/migrations/` — do NOT add new migrations for these tables._

- **activity_feed** — id, user_id, model_id, action, metadata, created_at
- **annotations** — id, user_id, model_id, title, description, x, y, z, camera_position, position, resolved, created_at, …
- **comments** — id, resourceType, resourceId, userId, parentId, body, editedAt, createdAt, updatedAt
- **devices** — id, createdAt, updatedAt, userId, name, pushPlatform, pushSubscription, hasPushSubscription
- **embeds** — id, user_id, model_id, width, height, auto_rotate, show_annotations, theme, created_at, updated_at
- **models** — id, user_id, name, description, file_url, file_size, format, thumbnail_url, polygon_count, visibility, camera_position, environment, …
- **notifications** — id, user_id, type, body, href, unread, created_at
- **resource_tags** — id, tagId, resourceType, resourceId, createdAt
- **tags** — id, name, slug, color, description, createdAt, updatedAt

## API surface (handlers)

_These endpoints already exist — open and extend the named file, never recreate it._

- **activity** — `api/src/handlers/activity.ts`
- **annotations** — `api/src/handlers/annotations.ts`
- **auth** — `api/src/handlers/auth.ts`
- **avatar** — `api/src/handlers/avatar.ts`
- **embeds** — `api/src/handlers/embeds.ts`
- **models** — `api/src/handlers/models.ts`
- **notifications** — `api/src/handlers/notifications.ts`

## Screens (14)

_These pages already exist — edit the named file in place, never create a parallel one._

- **Landing** `/` → `app/src/pages/Landing.tsx`
- **Login** `/login` → `app/src/pages/Login.tsx`
- **Signup** `/signup` → `app/src/pages/Signup.tsx`
- **ForgotPassword** `/forgot-password` → `app/src/pages/ForgotPassword.tsx`
- **ResetPassword** `/reset-password` → `app/src/pages/ResetPassword.tsx`
- **Dashboard** `/dashboard` (auth) → `app/src/pages/Dashboard.tsx`
- **ModelLibrary** `/models` (auth) → `app/src/pages/ModelLibrary.tsx`
- **ModelViewer** `/models/:id` (auth) → `app/src/pages/ModelViewer.tsx`
- **Upload** `/upload` (auth) → `app/src/pages/Upload.tsx`
- **Embed** `/models/:id/embed` (auth) → `app/src/pages/Embed.tsx`
- **Settings** `/settings` (auth) → `app/src/pages/Settings.tsx`
- **Annotations** `/models/:id/annotations` (auth) → `app/src/pages/Annotations.tsx`
- **ModelEdit** `/models/:id/edit` (auth) → `app/src/pages/ModelEdit.tsx`
- **Notifications** `/notifications` (auth) → `app/src/pages/Notifications.tsx`

## Subscription tiers

free / pro / team — gated by: maxAnnotations, maxEmbeds, maxModels, advancedFeatures, canExport, retentionDays

## Integrations (13 @molecule/* packages)

- **Database**: `@molecule/api-database-postgresql`
- **Domain resources**: `@molecule/api-resource-user`, `@molecule/api-resource-tag`, `@molecule/api-resource-comment`
- **Frontend / UI**: `@molecule/app-file-upload`, `@molecule/app-keyboard-shortcuts`, `@molecule/app-command-palette`, `@molecule/app-data-table`, `@molecule/app-virtual-scroll`, `@molecule/app-gallery`
- **Search**: `@molecule/api-search-meilisearch`
- **Uploads & media**: `@molecule/api-uploads-s3`, `@molecule/api-image-sharp`

## Required secrets

- DATABASE_URL — PostgreSQL connection string
- S3_BUCKET — S3 bucket for model storage
