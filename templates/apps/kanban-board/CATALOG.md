# Kanban Board

- **slug**: `kanban-board`
- **cluster**: productivity
- **type**: full-stack
- **layout**: dashboard

Trello-like boards with lists, cards, labels, drag-drop, and real-time collaboration

> **This is a complete, working app, already built.** The data model, handlers, and screens below all exist on disk (paths shown). Treat this as the user's existing codebase: **adapt the listed files in place** for the request; do not recreate tables, handlers, or pages that already exist, and do not add packages for functionality already implemented here.

## Features

`auth`, `realtime`, `drag-drop`, `labels`, `comments`

## Data model (18 domain tables)

_Already created by the existing SQL in `api/migrations/` — do NOT add new migrations for these tables._

- **activities** — id, actorId, action, resourceType, resourceId, metadata, createdAt
- **activity_seen_status** — userId, lastSeenActivityId, updatedAt
- **board_lists** — id, board_id, owner_id, name, position, is_archived, created_at, updated_at
- **board_members** — id, board_id, user_id, invited_by, role, accepted_at, created_at, updated_at
- **boards** — id, owner_id, user_id, name, description, background_color, is_starred, is_archived, position, created_at, updated_at
- **card_attachments** — id, card_id, owner_id, uploaded_by, file_url, file_name, mime, size, created_at
- **card_comments** — id, card_id, owner_id, author_id, body, mentions, created_at, updated_at
- **card_labels** — id, card_id, label_id, owner_id, created_at
- **cards** — id, board_id, list_id, owner_id, creator_id, assignee_id, title, description, due_date, priority, position, is_archived, …
- **checklist_items** — id, checklist_id, owner_id, text, is_done, position, created_at, updated_at
- **checklists** — id, card_id, owner_id, title, position, created_at, updated_at
- **comments** — id, resourceType, resourceId, userId, parentId, body, editedAt, createdAt, updatedAt
- **devices** — id, createdAt, updatedAt, userId, name, pushPlatform, pushSubscription, hasPushSubscription
- **labels** — id, board_id, owner_id, name, color, created_at, updated_at
- **notifications** — id, user_id, type, title, body, data, read_at, created_at
- **resource_tags** — id, tagId, resourceType, resourceId, createdAt
- **tags** — id, name, slug, color, description, createdAt, updatedAt
- **payments** — id, createdAt, updatedAt, userId, transactionId, productId, platformKey, data, receipt

## API surface (handlers)

_These endpoints already exist — open and extend the named file, never recreate it._

- **attachments** — `api/src/handlers/attachments.ts`
- **boards** — `api/src/handlers/boards.ts`
- **cards** — `api/src/handlers/cards.ts`
- **checklists** — `api/src/handlers/checklists.ts`
- **comments** — `api/src/handlers/comments.ts`
- **labels** — `api/src/handlers/labels.ts`
- **lists** — `api/src/handlers/lists.ts`
- **members** — `api/src/handlers/members.ts`
- **notifications** — `api/src/handlers/notifications.ts`

## Screens (13)

_These pages already exist — edit the named file in place, never create a parallel one._

- **Landing** `/` → `app/src/pages/Landing.tsx`
- **Login** `/login` → `app/src/pages/Login.tsx`
- **Signup** `/signup` → `app/src/pages/Signup.tsx`
- **ForgotPassword** `/forgot-password` → `app/src/pages/ForgotPassword.tsx`
- **ResetPassword** `/reset-password` → `app/src/pages/ResetPassword.tsx`
- **Dashboard** `/dashboard` (auth) → `app/src/pages/Dashboard.tsx`
- **Boards** `/boards` (auth) → `app/src/pages/Boards.tsx`
- **BoardDetail** `/boards/:id` (auth) → `app/src/pages/BoardDetail.tsx`
- **CardDetail** `/cards/:id` (auth) → `app/src/pages/CardDetail.tsx`
- **Backlog** `/backlog` (auth) → `app/src/pages/Backlog.tsx`
- **Team** `/team` (auth) → `app/src/pages/Team.tsx`
- **Settings** `/settings` (auth) → `app/src/pages/Settings.tsx`
- **Notifications** `/notifications` (auth) → `app/src/pages/Notifications.tsx`

## Subscription tiers

free / pro / team — gated by: maxBoards, maxCards, maxLists, advancedFeatures, canExport, retentionDays

## Integrations (11 @molecule/* packages)

- **Database**: `@molecule/api-database-postgresql`
- **Domain resources**: `@molecule/api-resource-user`, `@molecule/api-resource-comment`, `@molecule/api-resource-tag`, `@molecule/api-resource-activity-feed`
- **Frontend / UI**: `@molecule/app-kanban`, `@molecule/app-drag-drop-dndkit`, `@molecule/app-command-palette-cmdk`, `@molecule/app-keyboard-shortcuts-hotkeys`
- **Realtime**: `@molecule/api-realtime-socketio`, `@molecule/app-realtime-socketio`

## Required secrets

- DATABASE_URL — PostgreSQL connection string
