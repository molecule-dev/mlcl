# CI/CD Dashboard

- **slug**: `ci-cd-dashboard`
- **cluster**: developer-tools
- **type**: full-stack
- **layout**: dashboard

GitHub Actions-like CI/CD with pipelines, build logs, artifacts, and status badges

> **This is a complete, working app, already built.** The data model, handlers, and screens below all exist on disk (paths shown). Treat this as the user's existing codebase: **adapt the listed files in place** for the request; do not recreate tables, handlers, or pages that already exist, and do not add packages for functionality already implemented here.

## Features

`auth`, `notifications`, `search`, `realtime`

## Data model (15 domain tables)

_Already created by the existing SQL in `api/migrations/` — do NOT add new migrations for these tables._

- **activities** — id, actorId, action, resourceType, resourceId, metadata, createdAt
- **activity_seen_status** — userId, lastSeenActivityId, updatedAt
- **artifacts** — id, user_id, build_id, pipeline_id, name, filename, mime_type, size_bytes, storage_key, retention_days, created_at
- **build_logs** — id, user_id, build_id, step_name, level, message, timestamp
- **builds** — id, user_id, pipeline_id, status, branch, commit_sha, commit_message, author, triggered_by, duration_ms, exit_code, started_at, …
- **devices** — id, createdAt, updatedAt, userId, name, pushPlatform, pushSubscription, hasPushSubscription
- **environments** — id, user_id, name, url, status, traffic_pct, current_deploy, recent_deploys, created_at, updated_at
- **notifications** — id, createdAt, updatedAt
- **payments** — id, createdAt, updatedAt, userId, transactionId, productId, platformKey, data, receipt
- **pipeline_steps** — id, user_id, pipeline_id, build_id, name, sort_order, status, log_text, exit_code, started_at, finished_at, created_at
- **pipelines** — id, user_id, project_id, repository_id, name, branch, trigger_type, config, status, last_build_at, created_at, updated_at
- **projects** — id, userId, name, slug, projectType, framework, packages, envVars, sandboxId, sandboxStatus, lastActiveAt, settings, …
- **repositories** — id, user_id, project_id, slug, name, description, language, default_branch, provider, is_public, last_build_at, last_build_status, …
- **repository_secrets** — id, user_id, repository_id, name, scope, value_preview, last_used_at, created_at, updated_at
- **outgoing_webhooks** — id, user_id, repository_id, name, url, events, active, last_delivery_at, last_delivery_status, created_at, updated_at

## API surface (handlers)

_These endpoints already exist — open and extend the named file, never recreate it._

- **\_seed** — `api/src/handlers/_seed.ts`
- **artifacts** — `api/src/handlers/artifacts.ts`
- **builds** — `api/src/handlers/builds.ts`
- **decorators** — `api/src/handlers/decorators.ts`
- **environments** — `api/src/handlers/environments.ts`
- **insights** — `api/src/handlers/insights.ts`
- **notifications** — `api/src/handlers/notifications.ts`
- **pipelines** — `api/src/handlers/pipelines.ts`
- **profile** — `api/src/handlers/profile.ts`
- **repositories** — `api/src/handlers/repositories.ts`
- **secrets** — `api/src/handlers/secrets.ts`
- **webhooks** — `api/src/handlers/webhooks.ts`

## Screens (14)

_These pages already exist — edit the named file in place, never create a parallel one._

- **Landing** `/` → `app/src/pages/Landing.tsx`
- **Login** `/login` → `app/src/pages/Login.tsx`
- **Signup** `/signup` → `app/src/pages/Signup.tsx`
- **ForgotPassword** `/forgot-password` → `app/src/pages/ForgotPassword.tsx`
- **ResetPassword** `/reset-password` → `app/src/pages/ResetPassword.tsx`
- **Pipelines** `/pipelines` (auth) → `app/src/pages/Pipelines.tsx`
- **PipelineDetail** `/pipelines/:id` (auth) → `app/src/pages/PipelineDetail.tsx`
- **Environments** `/environments` (auth) → `app/src/pages/Environments.tsx`
- **Artifacts** `/artifacts` (auth) → `app/src/pages/Artifacts.tsx`
- **Settings** `/settings` (auth) → `app/src/pages/Settings.tsx`
- **Repositories** `/repositories` (auth) → `app/src/pages/Repositories.tsx`
- **RepositoryDetail** `/repositories/:slug` (auth) → `app/src/pages/RepositoryDetail.tsx`
- **Insights** `/insights` (auth) → `app/src/pages/Insights.tsx`
- **Notifications** `/notifications` (auth) → `app/src/pages/Notifications.tsx`

## Subscription tiers

free / pro / team — gated by: maxArtifacts, maxBuilds, maxPipelines, advancedFeatures, canExport, retentionDays

## Integrations (16 @molecule/* packages)

- **Database**: `@molecule/api-database-postgresql`
- **Domain resources**: `@molecule/api-resource-user`, `@molecule/api-resource-project`, `@molecule/api-resource-activity-feed`, `@molecule/api-resource-notification`
- **Frontend / UI**: `@molecule/app-data-table`, `@molecule/app-virtual-scroll`, `@molecule/app-command-palette`, `@molecule/app-keyboard-shortcuts`, `@molecule/app-timeline`, `@molecule/app-badge`
- **Notifications**: `@molecule/api-notifications-webhook`
- **Other API**: `@molecule/api-cron-node-cron`
- **Realtime**: `@molecule/api-realtime-sse`
- **Search**: `@molecule/api-search-meilisearch`
- **Uploads & media**: `@molecule/api-uploads-s3`

## Required secrets

- DATABASE_URL — PostgreSQL connection string
