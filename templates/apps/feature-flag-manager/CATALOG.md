# Feature Flag Manager

- **slug**: `feature-flag-manager`
- **cluster**: developer-tools
- **type**: full-stack
- **layout**: dashboard

LaunchDarkly-like feature flags with targeting rules, rollout percentages, and audit log

> **This is a complete, working app, already built.** The data model, handlers, and screens below all exist on disk (paths shown). Treat this as the user's existing codebase: **adapt the listed files in place** for the request; do not recreate tables, handlers, or pages that already exist, and do not add packages for functionality already implemented here.

## Features

`auth`, `search`

## Data model (8 domain tables)

_Already created by the existing SQL in `api/migrations/` — do NOT add new migrations for these tables._

- **audit_log** — id, user_id, action, actor, actor_email, target, flag_id, message, metadata, occurred_at, created_at, updatedAt
- **devices** — id, createdAt, updatedAt, userId, name, pushPlatform, pushSubscription, hasPushSubscription
- **feature_flags** — id, user_id, project_id, key, name, description, flag_type, default_value, state, rollout_percentage, environments, is_enabled, …
- **flag_environments** — id, user_id, project_id, key, name, color, is_production, sdk_key, client_key, flag_count, active_flag_count, created_at, …
- **projects** — id, userId, name, slug, projectType, framework, packages, envVars, sandboxId, sandboxStatus, lastActiveAt, settings, …
- **segments** — id, user_id, project_id, key, name, description, conditions, created_at, updated_at, updatedAt
- **targeting_rules** — id, user_id, flag_id, priority, attribute, operator, value, serve_value, description, created_at, updated_at, updatedAt
- **payments** — id, createdAt, updatedAt, userId, transactionId, productId, platformKey, data, receipt

## API surface (handlers)

_These endpoints already exist — open and extend the named file, never recreate it._

- **audit-log** — `api/src/handlers/audit-log.ts`
- **environments** — `api/src/handlers/environments.ts`
- **flags** — `api/src/handlers/flags.ts`
- **seed** — `api/src/handlers/seed.ts`
- **segments** — `api/src/handlers/segments.ts`

## Screens (13)

_These pages already exist — edit the named file in place, never create a parallel one._

- **Login** `/login` → `app/src/pages/Login.tsx`
- **Signup** `/signup` → `app/src/pages/Signup.tsx`
- **ForgotPassword** `/forgot-password` → `app/src/pages/ForgotPassword.tsx`
- **ResetPassword** `/reset-password` → `app/src/pages/ResetPassword.tsx`
- **Dashboard** `/dashboard` (auth) → `app/src/pages/Dashboard.tsx`
- **Flags** `/flags` (auth) → `app/src/pages/Flags.tsx`
- **FlagDetail** `/flags/:key` (auth) → `app/src/pages/FlagDetail.tsx`
- **AuditLog** `/audit` (auth) → `app/src/pages/AuditLog.tsx`
- **Environments** `/environments` (auth) → `app/src/pages/Environments.tsx`
- **Settings** `/settings` (auth) → `app/src/pages/Settings.tsx`
- **Segments** `/segments` (auth) → `app/src/pages/Segments.tsx`
- **SegmentDetail** `/segments/:key` (auth) → `app/src/pages/SegmentDetail.tsx`
- **NewFlag** `/flags/new` (auth) → `app/src/pages/NewFlag.tsx`

## Subscription tiers

free / pro / team — gated by: maxAuditLog, maxEnvironments, maxFlags, advancedFeatures, canExport, retentionDays

## Integrations (10 @molecule/* packages)

- **Database**: `@molecule/api-database-postgresql`
- **Domain resources**: `@molecule/api-resource-user`, `@molecule/api-resource-project`
- **Frontend / UI**: `@molecule/app-data-table`, `@molecule/app-command-palette`, `@molecule/app-keyboard-shortcuts`, `@molecule/app-virtual-scroll`
- **Other API**: `@molecule/api-feature-flags-database`, `@molecule/api-audit-database`
- **Search**: `@molecule/api-search-meilisearch`

## Required secrets

- DATABASE_URL — PostgreSQL connection string
