# Video Editor

- **slug**: `video-editor`
- **cluster**: creative-tools
- **type**: full-stack
- **layout**: dashboard

Clipchamp-like video editor with timeline, clips, transitions, and export

> **This is a complete, working app, already built.** The data model, handlers, and screens below all exist on disk (paths shown). Treat this as the user's existing codebase: **adapt the listed files in place** for the request; do not recreate tables, handlers, or pages that already exist, and do not add packages for functionality already implemented here.

## Features

`auth`, `timeline`, `transitions`, `clips`, `export`

## Data model (11 domain tables)

_Already created by the existing SQL in `api/migrations/` — do NOT add new migrations for these tables._

- **video_projects** — id, owner_id, name, description, width, height, fps, duration_ms, cover_url, template_id, created_at, updated_at
- **tracks** — id, project_id, owner_id, name, type, muted, locked, position, created_at, updated_at
- **clips** — id, project_id, track_id, owner_id, source_url, type, start_time, end_time, trim_start, trim_end, position, volume, …
- **transitions** — id, project_id, owner_id, type, duration_ms, clip_before_id, clip_after_id, position, created_at, updated_at
- **video_exports** — id, project_id, owner_id, format, quality, resolution, status, progress, output_url, error_message, created_at, finished_at
- **assets** — id, owner_id, name, kind, source_url, thumbnail_url, duration_ms, width, height, size_bytes, is_public, created_at, …
- **templates** — id, name, description, cover_image_url, project_snapshot, is_premium, category, created_at, updated_at
- **effects** — id, clip_id, project_id, owner_id, kind, parameters, position, created_at, updated_at
- **devices** — id, createdAt, updatedAt, userId, name, pushPlatform, pushSubscription, hasPushSubscription
- **tags** — id, name, slug, color, description, createdAt, updatedAt
- **resource_tags** — id, tagId, resourceType, resourceId, createdAt

## API surface (handlers)

_These endpoints already exist — open and extend the named file, never recreate it._

- **assets** — `api/src/handlers/assets.ts`
- **clips** — `api/src/handlers/clips.ts`
- **effects** — `api/src/handlers/effects.ts`
- **exports** — `api/src/handlers/exports.ts`
- **projects** — `api/src/handlers/projects.ts`
- **templates** — `api/src/handlers/templates.ts`
- **timeline** — `api/src/handlers/timeline.ts`

## Screens (16)

_These pages already exist — edit the named file in place, never create a parallel one._

- **Landing** `/` → `app/src/pages/Landing.tsx`
- **Login** `/login` → `app/src/pages/Login.tsx`
- **Signup** `/signup` → `app/src/pages/Signup.tsx`
- **ForgotPassword** `/forgot-password` → `app/src/pages/ForgotPassword.tsx`
- **ResetPassword** `/reset-password` → `app/src/pages/ResetPassword.tsx`
- **Dashboard** `/dashboard` (auth) → `app/src/pages/Dashboard.tsx`
- **Editor** `/editor/:id` (auth) → `app/src/pages/Editor.tsx`
- **AssetLibrary** `/assets` (auth) → `app/src/pages/AssetLibrary.tsx`
- **ExportQueue** `/export` (auth) → `app/src/pages/ExportQueue.tsx`
- **Templates** `/templates` (auth) → `app/src/pages/Templates.tsx`
- **Settings** `/settings` (auth) → `app/src/pages/Settings.tsx`
- **NewProject** `/projects/new` (auth) → `app/src/pages/NewProject.tsx`
- **ProjectDetail** `/projects/:id` (auth) → `app/src/pages/ProjectDetail.tsx`
- **AssetDetail** `/assets/:id` (auth) → `app/src/pages/AssetDetail.tsx`
- **TemplateDetail** `/templates/:id` (auth) → `app/src/pages/TemplateDetail.tsx`
- **ExportDetail** `/export/:id` (auth) → `app/src/pages/ExportDetail.tsx`

## Subscription tiers

free / pro / team — gated by: maxClips, maxExports, maxProjects, maxTimeline, advancedFeatures, canExport, retentionDays

## Integrations (13 @molecule/* packages)

- **Database**: `@molecule/api-database-postgresql`
- **Domain resources**: `@molecule/api-resource-user`, `@molecule/api-resource-tag`
- **Frontend / UI**: `@molecule/app-drag-drop`, `@molecule/app-keyboard-shortcuts`, `@molecule/app-command-palette`, `@molecule/app-file-upload`, `@molecule/app-timeline`, `@molecule/app-virtual-scroll`
- **Search**: `@molecule/api-search-meilisearch`
- **Uploads & media**: `@molecule/api-uploads-s3`, `@molecule/api-media-streaming-hls`, `@molecule/api-image-sharp`

## Required secrets

- DATABASE_URL — PostgreSQL connection string
- S3_BUCKET — S3 bucket for media storage
