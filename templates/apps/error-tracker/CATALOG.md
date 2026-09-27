# Error Tracker

- **slug**: `error-tracker`
- **cluster**: developer-tools
- **type**: full-stack
- **layout**: dashboard

Sentry-like error tracking with stack traces, grouping, alerts, and release tracking

> **This is a complete, working app, already built.** The data model, handlers, and screens below all exist on disk (paths shown). Treat this as the user's existing codebase: **adapt the listed files in place** for the request; do not recreate tables, handlers, or pages that already exist, and do not add packages for functionality already implemented here.

## Features

`auth`, `notifications`, `search`

## Data model (16 domain tables)

_Already created by the existing SQL in `api/migrations/` — do NOT add new migrations for these tables._

- **alert_rules** — id, user_id, project_id, name, rule_type, level, threshold, window_seconds, fingerprint_filter, scope, environment, channels, …
- **alert_triggers** — id, user_id, alert_rule_id, fired_at, value, snapshot
- **app_transactions** — id, user_id, project_id, transaction_name, duration_ms, status, environment, release, created_at
- **devices** — id, createdAt, updatedAt, userId, name, pushPlatform, pushSubscription, hasPushSubscription
- **error_events** — id, user_id, issue_id, project_id, message, stack_trace, level, environment, release, tags, extra, user_agent, …
- **issues** — id, user_id, project_id, fingerprint, title, exception_type, exception_value, culprit, level, status, first_seen, last_seen, …
- **notifications** — id, createdAt, updatedAt, user_id
- **projects** — id, userId, name, slug, projectType, framework, packages, envVars, sandboxId, sandboxStatus, lastActiveAt, settings, …
- **releases** — id, user_id, project_id, version, environment, deployed_at, author, commits, commit_sha, deploy_url, issue_count, new_issues, …
- **team_members** — id, user_id, member_id, role, assigned_issues, resolved_30d, active, created_at, name
- **user_api_keys** — id, user_id, name, prefix, last_used_at, last_used_label, created_at, revoked_at
- **user_sessions_view** — id, user_id, user_agent, ip_address, city, is_current, last_seen_at, created_at
- **connected_accounts** — id, user_id, provider, provider_username, connected, connected_at
- **org_settings** — id, user_id, org_name, region, retention_days, created_at, updated_at
- **org_integrations** — id, user_id, name, detail, connected, created_at
- **team_invites** — id, user_id, email, role, status, created_at

## API surface (handlers)

_These endpoints already exist — open and extend the named file, never recreate it._

- **\_seed** — `api/src/handlers/_seed.ts`
- **alerts** — `api/src/handlers/alerts.ts`
- **discover** — `api/src/handlers/discover.ts`
- **errors** — `api/src/handlers/errors.ts`
- **issues** — `api/src/handlers/issues.ts`
- **notifications** — `api/src/handlers/notifications.ts`
- **performance** — `api/src/handlers/performance.ts`
- **profile** — `api/src/handlers/profile.ts`
- **projects** — `api/src/handlers/projects.ts`
- **projects-health** — `api/src/handlers/projects-health.ts`
- **releases** — `api/src/handlers/releases.ts`
- **settings** — `api/src/handlers/settings.ts`
- **team** — `api/src/handlers/team.ts`

## Screens (19)

_These pages already exist — edit the named file in place, never create a parallel one._

- **Login** `/login` → `app/src/pages/Login.tsx`
- **Signup** `/signup` → `app/src/pages/Signup.tsx`
- **ForgotPassword** `/forgot-password` → `app/src/pages/ForgotPassword.tsx`
- **ResetPassword** `/reset-password` → `app/src/pages/ResetPassword.tsx`
- **Dashboard** `/dashboard` (auth) → `app/src/pages/Dashboard.tsx`
- **Issues** `/issues` (auth) → `app/src/pages/Issues.tsx`
- **IssueDetail** `/issues/:id` (auth) → `app/src/pages/IssueDetail.tsx`
- **Alerts** `/alerts` (auth) → `app/src/pages/Alerts.tsx`
- **Releases** `/releases` (auth) → `app/src/pages/Releases.tsx`
- **Settings** `/settings` (auth) → `app/src/pages/Settings.tsx`
- **Projects** `/projects` (auth) → `app/src/pages/Projects.tsx`
- **AlertDetail** `/alerts/:id` (auth) → `app/src/pages/AlertDetail.tsx`
- **ReleaseDetail** `/releases/:version` (auth) → `app/src/pages/ReleaseDetail.tsx`
- **Discover** `/discover` (auth) → `app/src/pages/Discover.tsx`
- **Performance** `/performance` (auth) → `app/src/pages/Performance.tsx`
- **Notifications** `/notifications` (auth) → `app/src/pages/Notifications.tsx`
- **Team** `/team` (auth) → `app/src/pages/Team.tsx`
- **Profile** `/profile` (auth) → `app/src/pages/Profile.tsx`
- **NotFound** `/404` → `app/src/pages/NotFound.tsx`

## Subscription tiers

free / pro / team — gated by: maxAlerts, maxErrors, maxIssues, maxReleases, advancedFeatures, canExport, retentionDays

## Integrations (14 @molecule/* packages)

- **Database**: `@molecule/api-database-postgresql`
- **Domain resources**: `@molecule/api-resource-user`, `@molecule/api-resource-project`, `@molecule/api-resource-notification`
- **Email**: `@molecule/api-emails-mailgun`
- **Frontend / UI**: `@molecule/app-data-table`, `@molecule/app-virtual-scroll`, `@molecule/app-command-palette`, `@molecule/app-keyboard-shortcuts`, `@molecule/app-charts`
- **Notifications**: `@molecule/api-notifications-webhook`
- **Other API**: `@molecule/api-cron-node-cron`, `@molecule/api-reporting-database`
- **Search**: `@molecule/api-search-meilisearch`

## Required secrets

- DATABASE_URL — PostgreSQL connection string
