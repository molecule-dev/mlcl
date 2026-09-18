# Whiteboard

- **slug**: `whiteboard`
- **cluster**: communication
- **type**: full-stack
- **layout**: dashboard

Miro-like collaborative canvas with shapes, sticky notes, drawing, and real-time cursors

> **This is a complete, working app, already built.** The data model, handlers, and screens below all exist on disk (paths shown). Treat this as the user's existing codebase: **adapt the listed files in place** for the request; do not recreate tables, handlers, or pages that already exist, and do not add packages for functionality already implemented here.

## Features

`auth`, `realtime`, `canvas`, `collaboration`, `sharing`

## Data model (8 domain tables)

_Already created by the existing SQL in `api/migrations/` — do NOT add new migrations for these tables._

- **board_collaborators** — id, board_id, user_id, email, role, accepted_at, created_at, updated_at
- **board_elements** — id, board_id, user_id, type, x, y, width, height, rotation, z_index, content, parent_id, …
- **board_frames** — id, board_id, user_id, name, viewport, order_index, created_at, updated_at
- **board_templates** — id, owner_id, user_id, name, description, snapshot, is_system, created_at, updated_at
- **board_versions** — id, board_id, user_id, snapshot, change_summary, created_by, created_at
- **boards** — id, owner_id, user_id, title, description, background, is_public, public_slug, trashed_at, created_at, updated_at
- **comments** — id, resourceType, resourceId, userId, parentId, body, editedAt, createdAt, updatedAt
- **devices** — id, createdAt, updatedAt, userId, name, pushPlatform, pushSubscription, hasPushSubscription

## API surface (handlers)

_These endpoints already exist — open and extend the named file, never recreate it._

- **boards** — `api/src/handlers/boards.ts`
- **collaborators** — `api/src/handlers/collaborators.ts`
- **elements** — `api/src/handlers/elements.ts`
- **frames** — `api/src/handlers/frames.ts`
- **templates** — `api/src/handlers/templates.ts`
- **versions** — `api/src/handlers/versions.ts`

## Screens (17)

_These pages already exist — edit the named file in place, never create a parallel one._

- **Landing** `/` → `app/src/pages/Landing.tsx`
- **Login** `/login` → `app/src/pages/Login.tsx`
- **Signup** `/signup` → `app/src/pages/Signup.tsx`
- **ForgotPassword** `/forgot-password` → `app/src/pages/ForgotPassword.tsx`
- **ResetPassword** `/reset-password` → `app/src/pages/ResetPassword.tsx`
- **Boards** `/boards` (auth) → `app/src/pages/Boards.tsx`
- **BoardCanvas** `/board/:id` (auth) → `app/src/pages/BoardCanvas.tsx`
- **Templates** `/templates` (auth) → `app/src/pages/Templates.tsx`
- **Shared** `/shared` (auth) → `app/src/pages/Shared.tsx`
- **Settings** `/settings` (auth) → `app/src/pages/Settings.tsx`
- **TemplateDetail** `/templates/:id` (auth) → `app/src/pages/TemplateDetail.tsx`
- **Notifications** `/notifications` (auth) → `app/src/pages/Notifications.tsx`
- **Profile** `/profile` (auth) → `app/src/pages/Profile.tsx`
- **Workspace** `/workspace` (auth) → `app/src/pages/Workspace.tsx`
- **Billing** `/billing` (auth) → `app/src/pages/Billing.tsx`
- **VersionHistory** `/board/:id/history` (auth) → `app/src/pages/VersionHistory.tsx`
- **PresentationMode** `/board/:id/present` (auth) → `app/src/pages/PresentationMode.tsx`

## Subscription tiers

free / pro / team — gated by: maxBoards, maxCollaborators, maxElements, advancedFeatures, canExport, retentionDays

## Integrations (11 @molecule/* packages)

- **Auth & permissions**: `@molecule/api-permissions-custom`
- **Database**: `@molecule/api-database-postgresql`
- **Domain resources**: `@molecule/api-resource-user`, `@molecule/api-resource-comment`
- **Email**: `@molecule/api-emails-mailgun`
- **Frontend / UI**: `@molecule/app-keyboard-shortcuts`
- **Realtime**: `@molecule/api-realtime-socketio`, `@molecule/app-realtime-socketio`
- **Uploads & media**: `@molecule/api-uploads-s3`, `@molecule/api-image-sharp`, `@molecule/app-image-crop`

## Required secrets

- DATABASE_URL — PostgreSQL connection string
- S3_BUCKET — S3 bucket for board assets
- MAILGUN_API_KEY — Mailgun API key for sharing invites
