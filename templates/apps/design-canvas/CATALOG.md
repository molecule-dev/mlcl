# Design Canvas

- **slug**: `design-canvas`
- **cluster**: creative-tools
- **type**: full-stack
- **layout**: dashboard

Figma-lite design tool with shapes, layers, text, and image export

> **This is a complete, working app, already built.** The data model, handlers, and screens below all exist on disk (paths shown). Treat this as the user's existing codebase: **adapt the listed files in place** for the request; do not recreate tables, handlers, or pages that already exist, and do not add packages for functionality already implemented here.

## Features

`auth`, `realtime-collaboration`, `search`, `export`, `layers`, `shapes`

## Data model (17 domain tables)

_Already created by the existing SQL in `api/migrations/` — do NOT add new migrations for these tables._

- **activities** — id, actorId, action, resourceType, resourceId, metadata, createdAt
- **activity_seen_status** — userId, lastSeenActivityId, updatedAt
- **comments** — id, resourceType, resourceId, userId, parentId, body, editedAt, createdAt, updatedAt
- **devices** — id, createdAt, updatedAt, userId, name, pushPlatform, pushSubscription, hasPushSubscription
- **exports** — id, project_id, user_id, format, quality, scale, status, download_url, created_at, updated_at
- **layers** — id, project_id, user_id, name, visible, locked, opacity, position, created_at, updated_at
- **project_activities** — id, project_id, user_id, action, metadata, created_at
- **project_collaborators** — id, project_id, user_id, role, invited_at, accepted_at
- **project_comments** — id, project_id, author_id, parent_id, body, x, y, resolved, created_at
- **projects** — id, user_id, team_id, name, width, height, canvas_data, thumbnail_url, created_at, updated_at
- **resource_tags** — id, tagId, resourceType, resourceId, createdAt
- **shapes** — id, project_id, layer_id, user_id, type, x, y, width, height, rotation, fill, stroke, …
- **tags** — id, name, slug, color, description, createdAt, updatedAt
- **templates** — id, name, category, thumbnail_url, canvas_data, is_public, created_at
- **notifications** — id, user_id, kind, actor_name, actor_color, sentence, target_label, target_href, preview, bucket, unread, created_at, …
- **design_tokens** — id, section, name, value, role, metadata, created_at
- **user_preferences** — user_id, preferences, updated_at

## API surface (handlers)

_These endpoints already exist — open and extend the named file, never recreate it._

- **\_seed** — `api/src/handlers/_seed.ts`
- **activities** — `api/src/handlers/activities.ts`
- **collaborators** — `api/src/handlers/collaborators.ts`
- **comments** — `api/src/handlers/comments.ts`
- **design_tokens** — `api/src/handlers/design_tokens.ts`
- **exports** — `api/src/handlers/exports.ts`
- **layers** — `api/src/handlers/layers.ts`
- **notifications** — `api/src/handlers/notifications.ts`
- **profile** — `api/src/handlers/profile.ts`
- **projects** — `api/src/handlers/projects.ts`
- **search** — `api/src/handlers/search.ts`
- **shapes** — `api/src/handlers/shapes.ts`
- **team** — `api/src/handlers/team.ts`
- **templates** — `api/src/handlers/templates.ts`

## Screens (14)

_These pages already exist — edit the named file in place, never create a parallel one._

- **Landing** `/` → `app/src/pages/Landing.tsx`
- **Login** `/login` → `app/src/pages/Login.tsx`
- **Signup** `/signup` → `app/src/pages/Signup.tsx`
- **ForgotPassword** `/forgot-password` → `app/src/pages/ForgotPassword.tsx`
- **ResetPassword** `/reset-password` → `app/src/pages/ResetPassword.tsx`
- **Dashboard** `/dashboard` (auth) → `app/src/pages/Dashboard.tsx`
- **Editor** `/editor/:id` (auth) → `app/src/pages/Editor.tsx`
- **Templates** `/templates` (auth) → `app/src/pages/Templates.tsx`
- **Library** `/library` (auth) → `app/src/pages/Library.tsx`
- **Settings** `/settings` (auth) → `app/src/pages/Settings.tsx`
- **Profile** `/profile` (auth) → `app/src/pages/Profile.tsx`
- **Team** `/team` (auth) → `app/src/pages/Team.tsx`
- **Notifications** `/notifications` (auth) → `app/src/pages/Notifications.tsx`
- **Search** `/search` (auth) → `app/src/pages/Search.tsx`

## Subscription tiers

free / pro / team — gated by: maxExports, maxLayers, maxProjects, maxShapes, advancedFeatures, canExport, retentionDays

## Integrations (17 @molecule/* packages)

- **Auth & permissions**: `@molecule/api-permissions-custom`
- **Database**: `@molecule/api-database-postgresql`
- **Domain resources**: `@molecule/api-resource-user`, `@molecule/api-resource-tag`, `@molecule/api-resource-comment`, `@molecule/api-resource-activity-feed`
- **Frontend / UI**: `@molecule/app-drag-drop`, `@molecule/app-keyboard-shortcuts`, `@molecule/app-command-palette`, `@molecule/app-data-table`, `@molecule/app-tree-view`, `@molecule/app-file-upload`
- **Realtime**: `@molecule/api-realtime-socketio`, `@molecule/app-realtime-socketio`
- **Search**: `@molecule/api-search-meilisearch`
- **Uploads & media**: `@molecule/api-uploads-s3`, `@molecule/api-image-sharp`

## Required secrets

- DATABASE_URL — PostgreSQL connection string
- S3_BUCKET — S3 bucket for asset storage
