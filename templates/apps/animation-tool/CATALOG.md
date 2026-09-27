# Animation Tool

- **slug**: `animation-tool`
- **cluster**: creative-tools
- **type**: full-stack
- **layout**: dashboard

Rive-like animation tool with keyframes, easing, state machines, and export

> **This is a complete, working app, already built.** The data model, handlers, and screens below all exist on disk (paths shown). Treat this as the user's existing codebase: **adapt the listed files in place** for the request; do not recreate tables, handlers, or pages that already exist, and do not add packages for functionality already implemented here.

## Features

`auth`, `keyframes`, `easing`, `state-machines`, `layers`, `export`

## Data model (12 domain tables)

_Already created by the existing SQL in `api/migrations/` — do NOT add new migrations for these tables._

- **animation_exports** — id, project_id, format, quality, status, output_url, created_at, updatedAt, artifact_data
- **animation_projects** — id, owner_id, user_id, name, width, height, fps, duration, created_at, updated_at, updatedAt
- **animation_states** — id, project_id, name, animation_id, transitions, is_initial, created_at, updatedAt
- **animations** — id, project_id, name, target_layer_id, duration, looping, created_at, updatedAt
- **assets** — id, owner_id, user_id, kind, url, name, size_bytes, created_at, updatedAt
- **devices** — id, createdAt, updatedAt, userId, name, pushPlatform, pushSubscription, hasPushSubscription
- **keyframes** — id, project_id, layer_id, time, property, value, easing, created_at, updatedAt
- **layers** — id, project_id, parent_id, name, type, z_index, locked, hidden, transform, created_at, updatedAt
- **payments** — id, createdAt, updatedAt, userId, transactionId, productId, platformKey, data, receipt
- **resource_tags** — id, tagId, resourceType, resourceId, createdAt
- **share_tokens** — id, project_id, token, expires_at, created_by, created_at, updatedAt
- **tags** — id, name, slug, color, description, createdAt, updatedAt

## API surface (handlers)

_These endpoints already exist — open and extend the named file, never recreate it._

- **activity** — `api/src/handlers/activity.ts`
- **assets** — `api/src/handlers/assets.ts`
- **exports** — `api/src/handlers/exports.ts`
- **keyframes** — `api/src/handlers/keyframes.ts`
- **layers** — `api/src/handlers/layers.ts`
- **library** — `api/src/handlers/library.ts`
- **projects** — `api/src/handlers/projects.ts`
- **states** — `api/src/handlers/states.ts`

## Screens (14)

_These pages already exist — edit the named file in place, never create a parallel one._

- **Landing** `/` → `app/src/pages/Landing.tsx`
- **Login** `/login` → `app/src/pages/Login.tsx`
- **Signup** `/signup` → `app/src/pages/Signup.tsx`
- **ForgotPassword** `/forgot-password` → `app/src/pages/ForgotPassword.tsx`
- **ResetPassword** `/reset-password` → `app/src/pages/ResetPassword.tsx`
- **Dashboard** `/dashboard` (auth) → `app/src/pages/Dashboard.tsx`
- **Editor** `/projects/:id` (auth) → `app/src/pages/Editor.tsx`
- **Projects** `/projects` (auth) → `app/src/pages/Projects.tsx`
- **Library** `/library` (auth) → `app/src/pages/Library.tsx`
- **Export** `/projects/:id/export` (auth) → `app/src/pages/Export.tsx`
- **Settings** `/settings` (auth) → `app/src/pages/Settings.tsx`
- **Assets** `/assets` (auth) → `app/src/pages/Assets.tsx`
- **StateMachine** `/projects/:id/states` (auth) → `app/src/pages/StateMachine.tsx`
- **SharePreview** `/share/:token` → `app/src/pages/SharePreview.tsx`

## Subscription tiers

free / pro / team — gated by: maxExports, maxKeyframes, maxProjects, maxStates, advancedFeatures, canExport, retentionDays

## Integrations (12 @molecule/* packages)

- **Database**: `@molecule/api-database-postgresql`
- **Domain resources**: `@molecule/api-resource-user`, `@molecule/api-resource-tag`
- **Frontend / UI**: `@molecule/app-drag-drop`, `@molecule/app-keyboard-shortcuts`, `@molecule/app-command-palette`, `@molecule/app-timeline`, `@molecule/app-tree-view`, `@molecule/app-file-upload`
- **Search**: `@molecule/api-search-meilisearch`
- **Uploads & media**: `@molecule/api-uploads-s3`, `@molecule/api-image-sharp`

## Required secrets

- DATABASE_URL — PostgreSQL connection string
- S3_BUCKET — S3 bucket for asset storage
