# Photo Editor

- **slug**: `photo-editor`
- **cluster**: creative-tools
- **type**: full-stack
- **layout**: dashboard

Pixlr-like photo editor with filters, crop, adjustments, and layers

> **This is a complete, working app, already built.** The data model, handlers, and screens below all exist on disk (paths shown). Treat this as the user's existing codebase: **adapt the listed files in place** for the request; do not recreate tables, handlers, or pages that already exist, and do not add packages for functionality already implemented here.

## Features

`auth`, `filters`, `crop`, `adjustments`, `layers`, `export`

## Data model (10 domain tables)

_Already created by the existing SQL in `api/migrations/` — do NOT add new migrations for these tables._

- **albums** — id, user_id, name, cover_image_id, created_at, updatedAt
- **images** — id, user_id, name, original_url, current_url, width, height, album_id, edit_history, is_public, created_at, updatedAt
- **adjustments** — id, user_id, image_id, adjustment_type, value, created_at
- **filter_applications** — id, user_id, image_id, filter_type, intensity, parameters, created_at
- **filter_presets** — id, user_id, name, parameters, created_at
- **exports** — id, user_id, image_id, format, quality, width, height, status, output_url, created_at
- **layers** — id, user_id, image_id, kind, parameters, opacity, blend_mode, z_index, hidden, created_at, updatedAt
- **devices** — id, createdAt, updatedAt, userId, name, pushPlatform, pushSubscription, hasPushSubscription
- **tags** — id, name, slug, color, description, createdAt, updatedAt
- **resource_tags** — id, tagId, resourceType, resourceId, createdAt

## API surface (handlers)

_These endpoints already exist — open and extend the named file, never recreate it._

- **adjustments** — `api/src/handlers/adjustments.ts`
- **albums** — `api/src/handlers/albums.ts`
- **exports** — `api/src/handlers/exports.ts`
- **filters** — `api/src/handlers/filters.ts`
- **images** — `api/src/handlers/images.ts`
- **layers** — `api/src/handlers/layers.ts`

## Screens (12)

_These pages already exist — edit the named file in place, never create a parallel one._

- **Landing** `/` → `app/src/pages/Landing.tsx`
- **Login** `/login` → `app/src/pages/Login.tsx`
- **Signup** `/signup` → `app/src/pages/Signup.tsx`
- **ForgotPassword** `/forgot-password` → `app/src/pages/ForgotPassword.tsx`
- **ResetPassword** `/reset-password` → `app/src/pages/ResetPassword.tsx`
- **Editor** `/editor` (auth) → `app/src/pages/Editor.tsx`
- **Library** `/library` (auth) → `app/src/pages/Library.tsx`
- **Export** `/export` (auth) → `app/src/pages/Export.tsx`
- **Settings** `/settings` (auth) → `app/src/pages/Settings.tsx`
- **AlbumDetail** `/album/:id` (auth) → `app/src/pages/AlbumDetail.tsx`
- **Presets** `/presets` (auth) → `app/src/pages/Presets.tsx`
- **Profile** `/profile` (auth) → `app/src/pages/Profile.tsx`

## Subscription tiers

free / pro / team — gated by: maxAdjustments, maxExports, maxFilters, maxImages, advancedFeatures, canExport, retentionDays

## Integrations (13 @molecule/* packages)

- **Database**: `@molecule/api-database-postgresql`
- **Domain resources**: `@molecule/api-resource-user`, `@molecule/api-resource-tag`
- **Frontend / UI**: `@molecule/app-file-upload`, `@molecule/app-gallery`, `@molecule/app-keyboard-shortcuts`, `@molecule/app-command-palette`, `@molecule/app-data-table`, `@molecule/app-virtual-scroll`
- **Search**: `@molecule/api-search-meilisearch`
- **Uploads & media**: `@molecule/api-uploads-s3`, `@molecule/api-image-sharp`, `@molecule/app-image-crop`

## Required secrets

- DATABASE_URL — PostgreSQL connection string
- S3_BUCKET — S3 bucket for image storage
