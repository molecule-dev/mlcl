# To-do List

- **slug**: `to-do-list`
- **cluster**: productivity
- **type**: full-stack
- **layout**: dashboard

Todoist-like task management with projects, labels, recurring tasks, and reminders

> **This is a complete, working app, already built.** The data model, handlers, and screens below all exist on disk (paths shown). Treat this as the user's existing codebase: **adapt the listed files in place** for the request; do not recreate tables, handlers, or pages that already exist, and do not add packages for functionality already implemented here.

## Features

`auth`, `notifications`, `recurring-tasks`, `labels`, `projects`

## Data model (9 domain tables)

_Already created by the existing SQL in `api/migrations/` — do NOT add new migrations for these tables._

- **devices** — id, createdAt, updatedAt, userId, name, pushPlatform, pushSubscription, hasPushSubscription
- **labels** — id, owner_id, name, color, created_at, updated_at
- **notifications** — id, user_id, type, title, body, data, read_at, created_at
- **projects** — id, owner_id, name, color, icon, parent_id, position, is_favorite, is_archived, created_at, updated_at
- **resource_tags** — id, tagId, resourceType, resourceId, createdAt
- **tags** — id, name, slug, color, description, createdAt, updatedAt
- **task_comments** — id, task_id, owner_id, body, created_at
- **task_labels** — task_id, label_id, owner_id, created_at
- **tasks** — id, owner_id, project_id, parent_id, title, description, priority, due_date, due_time, recurrence_rule, position, is_completed, …

## API surface (handlers)

_These endpoints already exist — open and extend the named file, never recreate it._

- **labels** — `api/src/handlers/labels.ts`
- **notifications** — `api/src/handlers/notifications.ts`
- **projects** — `api/src/handlers/projects.ts`
- **tasks** — `api/src/handlers/tasks.ts`

## Screens (16)

_These pages already exist — edit the named file in place, never create a parallel one._

- **Landing** `/` → `app/src/pages/Landing.tsx`
- **Login** `/login` → `app/src/pages/Login.tsx`
- **Signup** `/signup` → `app/src/pages/Signup.tsx`
- **ForgotPassword** `/forgot-password` → `app/src/pages/ForgotPassword.tsx`
- **ResetPassword** `/reset-password` → `app/src/pages/ResetPassword.tsx`
- **Today** `/today` (auth) → `app/src/pages/Today.tsx`
- **Inbox** `/inbox` (auth) → `app/src/pages/Inbox.tsx`
- **Upcoming** `/upcoming` (auth) → `app/src/pages/Upcoming.tsx`
- **ProjectDetail** `/projects/:id` (auth) → `app/src/pages/ProjectDetail.tsx`
- **Labels** `/labels` (auth) → `app/src/pages/Labels.tsx`
- **Settings** `/settings` (auth) → `app/src/pages/Settings.tsx`
- **TaskDetail** `/tasks/:id` (auth) → `app/src/pages/TaskDetail.tsx`
- **Completed** `/completed` (auth) → `app/src/pages/Completed.tsx`
- **Notifications** `/notifications` (auth) → `app/src/pages/Notifications.tsx`
- **Search** `/search` (auth) → `app/src/pages/Search.tsx`
- **Analytics** `/analytics` (auth) → `app/src/pages/Analytics.tsx`

## Subscription tiers

free / pro / team — gated by: maxLabels, maxProjects, maxTasks, advancedFeatures, canExport, retentionDays

## Integrations (9 @molecule/* packages)

- **Database**: `@molecule/api-database-postgresql`
- **Domain resources**: `@molecule/api-resource-user`, `@molecule/api-resource-tag`
- **Frontend / UI**: `@molecule/app-drag-drop-dndkit`, `@molecule/app-keyboard-shortcuts-hotkeys`, `@molecule/app-calendar`, `@molecule/app-command-palette-cmdk`
- **Notifications**: `@molecule/api-push-notifications-web-push`
- **Other API**: `@molecule/api-cron-node-cron`

## Required secrets

- DATABASE_URL — PostgreSQL connection string
- VAPID_PUBLIC_KEY — VAPID public key for push notifications
- VAPID_PRIVATE_KEY — VAPID private key for push notifications
