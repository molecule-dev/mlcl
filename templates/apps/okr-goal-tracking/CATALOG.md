# OKR / Goal Tracking

- **slug**: `okr-goal-tracking`
- **cluster**: business-saas
- **type**: full-stack
- **layout**: dashboard

Lattice-like OKR tracking with objectives, key results, and check-ins

> **This is a complete, working app, already built.** The data model, handlers, and screens below all exist on disk (paths shown). Treat this as the user's existing codebase: **adapt the listed files in place** for the request; do not recreate tables, handlers, or pages that already exist, and do not add packages for functionality already implemented here.

## Features

`auth`, `objectives`, `key-results`, `check-ins`, `progress-tracking`

## Data model (14 domain tables)

_Already created by the existing SQL in `api/migrations/` — do NOT add new migrations for these tables._

- **activities** — id, actorId, action, resourceType, resourceId, metadata, createdAt
- **activity_seen_status** — userId, lastSeenActivityId, updatedAt
- **audit_events** — id, owner_id, actor_user_id, table_name, record_id, action, before, after, occurred_at
- **check_ins** — id, owner_id, objective_id, key_result_id, value, confidence, status, note, occurred_at, created_at
- **comments** — id, resourceType, resourceId, userId, parentId, body, editedAt, createdAt, updatedAt
- **devices** — id, createdAt, updatedAt, userId, name, pushPlatform, pushSubscription, hasPushSubscription
- **key_results** — id, owner_id, objective_id, title, metric_type, start_value, target_value, current_value, unit, status, progress, position, …
- **notifications** — id, user_id, type, title, body, data, read_at, created_at
- **objectives** — id, owner_id, team_id, period_id, parent_id, scope, title, description, status, progress, archived_at, created_at, …
- **periods** — id, owner_id, name, start_date, end_date, is_active, created_at, updated_at
- **reviews** — id, owner_id, period_id, employee_user_id, reviewer_user_id, summary, rating, status, submitted_at, created_at, updated_at
- **teams** — id, owner_id, name, parent_id, lead_user_id, created_at, updated_at
- **user_settings** — user_id, cadence, preferences, updated_at
- **payments** — id, createdAt, updatedAt, userId, transactionId, productId, platformKey, data, receipt

## API surface (handlers)

_These endpoints already exist — open and extend the named file, never recreate it._

- **\_progress** — `api/src/handlers/_progress.ts`
- **audit-events** — `api/src/handlers/audit-events.ts`
- **check-ins** — `api/src/handlers/check-ins.ts`
- **key-results** — `api/src/handlers/key-results.ts`
- **notifications** — `api/src/handlers/notifications.ts`
- **objectives** — `api/src/handlers/objectives.ts`
- **periods** — `api/src/handlers/periods.ts`
- **reviews** — `api/src/handlers/reviews.ts`
- **settings** — `api/src/handlers/settings.ts`
- **teams** — `api/src/handlers/teams.ts`

## Screens (18)

_These pages already exist — edit the named file in place, never create a parallel one._

- **Landing** `/` → `app/src/pages/Landing.tsx`
- **Login** `/login` → `app/src/pages/Login.tsx`
- **Signup** `/signup` → `app/src/pages/Signup.tsx`
- **ForgotPassword** `/forgot-password` → `app/src/pages/ForgotPassword.tsx`
- **ResetPassword** `/reset-password` → `app/src/pages/ResetPassword.tsx`
- **Dashboard** `/dashboard` (auth) → `app/src/pages/Dashboard.tsx`
- **Objectives** `/objectives` (auth) → `app/src/pages/Objectives.tsx`
- **ObjectiveDetail** `/objectives/:id` (auth) → `app/src/pages/ObjectiveDetail.tsx`
- **CheckIn** `/check-in` (auth) → `app/src/pages/CheckIn.tsx`
- **Team** `/team` (auth) → `app/src/pages/Team.tsx`
- **Reviews** `/reviews` (auth) → `app/src/pages/Reviews.tsx`
- **Settings** `/settings` (auth) → `app/src/pages/Settings.tsx`
- **NewObjective** `/objectives/new` (auth) → `app/src/pages/NewObjective.tsx`
- **EditObjective** `/objectives/:id/edit` (auth) → `app/src/pages/EditObjective.tsx`
- **ReviewDetail** `/reviews/:id` (auth) → `app/src/pages/ReviewDetail.tsx`
- **Notifications** `/notifications` (auth) → `app/src/pages/Notifications.tsx`
- **Profile** `/profile` (auth) → `app/src/pages/Profile.tsx`
- **Billing** `/settings/billing` (auth) → `app/src/pages/Billing.tsx`

## Subscription tiers

free / pro / team — gated by: maxCheckIns, maxKeyResults, maxObjectives, advancedFeatures, canExport, retentionDays

## Integrations (8 @molecule/* packages)

- **Auth & permissions**: `@molecule/api-permissions-custom`
- **Database**: `@molecule/api-database-postgresql`
- **Domain resources**: `@molecule/api-resource-user`, `@molecule/api-resource-comment`, `@molecule/api-resource-activity-feed`
- **Frontend / UI**: `@molecule/app-data-table`, `@molecule/app-tree-view`, `@molecule/app-command-palette`

## Required secrets

- DATABASE_URL — PostgreSQL connection string
