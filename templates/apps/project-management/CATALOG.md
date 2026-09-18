# Project Management

- **slug**: `project-management`
- **cluster**: business-saas
- **type**: full-stack
- **layout**: dashboard

Asana-like task management with Kanban, milestones, and team views

> **This is a complete, working app, already built.** The data model, handlers, and screens below all exist on disk (paths shown). Treat this as the user's existing codebase: **adapt the listed files in place** for the request; do not recreate tables, handlers, or pages that already exist, and do not add packages for functionality already implemented here.

## Features

`auth`, `search`, `kanban`, `milestones`, `realtime`, `notifications`

## Data model (11 domain tables)

_Already created by the existing SQL in `api/migrations/` — do NOT add new migrations for these tables._

- **activities** — id, actorId, action, resourceType, resourceId, metadata, createdAt
- **activity_seen_status** — userId, lastSeenActivityId, updatedAt
- **comments** — id, resourceType, resourceId, userId, parentId, body, editedAt, createdAt, updatedAt
- **devices** — id, createdAt, updatedAt, userId, name, pushPlatform, pushSubscription, hasPushSubscription
- **milestones** — id, project_id, title, description, due_date, status, created_at, updated_at, updatedAt
- **notifications** — id, createdAt, updatedAt
- **project_members** — id, project_id, user_id, role, joined_at, updatedAt
- **projects** — id, owner_id, user_id, name, description, status, color, start_date, due_date, created_at, updated_at, updatedAt
- **resource_tags** — id, tagId, resourceType, resourceId, createdAt
- **tags** — id, name, slug, color, description, createdAt, updatedAt
- **tasks** — id, created_by, project_id, title, description, status, priority, assignee_id, milestone_id, due_date, position, created_at, …

## API surface (handlers)

_These endpoints already exist — open and extend the named file, never recreate it._

- **\_ownership** — `api/src/handlers/_ownership.ts`
- **members** — `api/src/handlers/members.ts`
- **milestones** — `api/src/handlers/milestones.ts`
- **profile** — `api/src/handlers/profile.ts`
- **projects** — `api/src/handlers/projects.ts`
- **tasks** — `api/src/handlers/tasks.ts`

## Screens (9)

_These pages already exist — edit the named file in place, never create a parallel one._

- **Board** `/projects/:projectId/board` (auth) → `app/src/pages/Board.tsx`
- **Dashboard** `/` (auth) → `app/src/pages/Dashboard.tsx`
- **TaskList** `/projects/:projectId/tasks` (auth) → `app/src/pages/TaskList.tsx`
- **Timeline** `/projects/:projectId/timeline` (auth) → `app/src/pages/Timeline.tsx`
- **Settings** `/settings` (auth) → `app/src/pages/Settings.tsx`
- **Login** `/login` → `app/src/pages/Login.tsx`
- **Signup** `/signup` → `app/src/pages/Signup.tsx`
- **ForgotPassword** `/forgot-password` → `app/src/pages/ForgotPassword.tsx`
- **ResetPassword** `/reset-password` → `app/src/pages/ResetPassword.tsx`

## Subscription tiers

free / pro / team — gated by: maxProjects, maxTasks, maxMilestones, maxMembersPerProject, realtimeCollaboration, advancedReports, activityRetentionDays, calendarView, customFields

## Integrations (16 @molecule/* packages)

- **Auth & permissions**: `@molecule/api-permissions-custom`
- **Database**: `@molecule/api-database-postgresql`
- **Domain resources**: `@molecule/api-resource-user`, `@molecule/api-resource-comment`, `@molecule/api-resource-tag`, `@molecule/api-resource-activity-feed`, `@molecule/api-resource-notification`
- **Frontend / UI**: `@molecule/app-kanban`, `@molecule/app-data-table`, `@molecule/app-calendar`, `@molecule/app-drag-drop`, `@molecule/app-command-palette`, `@molecule/app-keyboard-shortcuts`
- **Realtime**: `@molecule/api-realtime-socketio`, `@molecule/app-realtime-socketio`
- **Search**: `@molecule/api-search-meilisearch`

## Required secrets

- DATABASE_URL — PostgreSQL connection string
- MEILISEARCH_API_KEY — MeiliSearch API key
