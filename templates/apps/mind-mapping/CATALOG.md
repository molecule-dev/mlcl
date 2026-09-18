# Mind Mapping

- **slug**: `mind-mapping`
- **cluster**: productivity
- **type**: full-stack
- **layout**: dashboard

Miro-like mind maps with draggable nodes, connections, real-time collaboration, and canvas zoom/pan

> **This is a complete, working app, already built.** The data model, handlers, and screens below all exist on disk (paths shown). Treat this as the user's existing codebase: **adapt the listed files in place** for the request; do not recreate tables, handlers, or pages that already exist, and do not add packages for functionality already implemented here.

## Features

`auth`, `realtime`, `drag-drop`, `canvas`, `keyboard-shortcuts`

## Data model (10 domain tables)

_Already created by the existing SQL in `api/migrations/` — do NOT add new migrations for these tables._

- **connections** — id, map_id, source_node_id, target_node_id, label, style, created_at, updated_at
- **devices** — id, createdAt, updatedAt, userId, name, pushPlatform, pushSubscription, hasPushSubscription
- **map_collaborators** — id, map_id, user_id, email, role, accepted_at, created_at
- **map_templates** — id, owner_id, name, description, snapshot, is_system, created_at
- **map_versions** — id, map_id, snapshot, created_by, change_summary, created_at
- **maps** — id, owner_id, title, description, theme, root_node_id, is_template, is_public, public_slug, trashed_at, created_at, updated_at
- **nodes** — id, map_id, parent_id, text, color, shape, size, x, y, position, created_at, updated_at
- **resource_tags** — id, tagId, resourceType, resourceId, createdAt
- **tags** — id, name, slug, color, description, createdAt, updatedAt
- **payments** — id, createdAt, updatedAt, userId, transactionId, productId, platformKey, data, receipt

## API surface (handlers)

_These endpoints already exist — open and extend the named file, never recreate it._

- **collaborators** — `api/src/handlers/collaborators.ts`
- **connections** — `api/src/handlers/connections.ts`
- **maps** — `api/src/handlers/maps.ts`
- **nodes** — `api/src/handlers/nodes.ts`
- **templates** — `api/src/handlers/templates.ts`
- **versions** — `api/src/handlers/versions.ts`

## Screens (17)

_These pages already exist — edit the named file in place, never create a parallel one._

- **Landing** `/` → `app/src/pages/Landing.tsx`
- **Login** `/login` → `app/src/pages/Login.tsx`
- **Signup** `/signup` → `app/src/pages/Signup.tsx`
- **ForgotPassword** `/forgot-password` → `app/src/pages/ForgotPassword.tsx`
- **ResetPassword** `/reset-password` → `app/src/pages/ResetPassword.tsx`
- **Dashboard** `/dashboard` (auth) → `app/src/pages/Dashboard.tsx`
- **Maps** `/maps` (auth) → `app/src/pages/Maps.tsx`
- **MapEditor** `/maps/:id` (auth) → `app/src/pages/MapEditor.tsx`
- **Templates** `/templates` (auth) → `app/src/pages/Templates.tsx`
- **Share** `/maps/:id/share` (auth) → `app/src/pages/Share.tsx`
- **Settings** `/settings` (auth) → `app/src/pages/Settings.tsx`
- **Profile** `/profile` (auth) → `app/src/pages/Profile.tsx`
- **Notifications** `/notifications` (auth) → `app/src/pages/Notifications.tsx`
- **Billing** `/settings/billing` (auth) → `app/src/pages/Billing.tsx`
- **VersionHistory** `/maps/:id/history` (auth) → `app/src/pages/VersionHistory.tsx`
- **TemplateDetail** `/templates/:id` (auth) → `app/src/pages/TemplateDetail.tsx`
- **Trash** `/trash` (auth) → `app/src/pages/Trash.tsx`

## Subscription tiers

free / pro / team — gated by: maxConnections, maxMaps, maxNodes, advancedFeatures, canExport, retentionDays

## Integrations (9 @molecule/* packages)

- **Database**: `@molecule/api-database-postgresql`
- **Domain resources**: `@molecule/api-resource-user`, `@molecule/api-resource-tag`
- **Frontend / UI**: `@molecule/app-drag-drop-dndkit`, `@molecule/app-keyboard-shortcuts-hotkeys`, `@molecule/app-command-palette-cmdk`
- **Realtime**: `@molecule/api-realtime-socketio`, `@molecule/app-realtime-socketio`
- **Uploads & media**: `@molecule/api-uploads-s3`

## Required secrets

- DATABASE_URL — PostgreSQL connection string
