# Log Viewer

- **slug**: `log-viewer`
- **cluster**: developer-tools
- **type**: full-stack
- **layout**: dashboard

Datadog-like log viewer with search, filtering, live tail, and structured log parsing

> **This is a complete, working app, already built.** The data model, handlers, and screens below all exist on disk (paths shown). Treat this as the user's existing codebase: **adapt the listed files in place** for the request; do not recreate tables, handlers, or pages that already exist, and do not add packages for functionality already implemented here.

## Features

`auth`, `search`, `realtime`

## Data model (12 domain tables)

_Already created by the existing SQL in `api/migrations/` — do NOT add new migrations for these tables._

- **alert_fires** — id, user_id, alert_rule_id, fired_at, value, snapshot, created_at
- **alert_rules** — id, user_id, name, condition, severity, channels, status, threshold, window_seconds, fire_count_24h, last_fired_at, created_at, …
- **devices** — id, createdAt, updatedAt, userId, name, pushPlatform, pushSubscription, hasPushSubscription
- **incident_updates** — id, user_id, incident_id, body, status_change, posted_by, created_at
- **incidents** — id, user_id, title, severity, status, service, owner, started_at, resolved_at, impacted_users, alert_rule_id, created_at, …
- **log_sources** — id, user_id, name, format, source, type, environment, rate_per_sec, retention_days, status, is_active, ingest_token, …
- **logs** — id, user_id, source_id, service, severity, level, message, host, environment, trace_id, span_id, fields, …
- **projects** — id, userId, name, slug, projectType, framework, packages, envVars, sandboxId, sandboxStatus, lastActiveAt, settings, …
- **saved_searches** — id, user_id, name, query_string, filters, result_count, last_run_at, shared, owner, created_at, updated_at
- **services** — id, user_id, name, description, owner_team, health, error_rate_pct, log_rate_per_min, recent_volume, created_at, updated_at
- **spans** — id, user_id, trace_id, parent_span_id, service, operation, started_at, duration_ms, status, attributes, created_at
- **traces** — id, user_id, root_service, operation, started_at, duration_ms, span_count, error_count, status, attributes, created_at

## API surface (handlers)

_These endpoints already exist — open and extend the named file, never recreate it._

- **\_seed** — `api/src/handlers/_seed.ts`
- **alerts** — `api/src/handlers/alerts.ts`
- **incidents** — `api/src/handlers/incidents.ts`
- **logs** — `api/src/handlers/logs.ts`
- **saved-searches** — `api/src/handlers/saved-searches.ts`
- **services** — `api/src/handlers/services.ts`
- **sources** — `api/src/handlers/sources.ts`
- **streams** — `api/src/handlers/streams.ts`
- **traces** — `api/src/handlers/traces.ts`

## Screens (18)

_These pages already exist — edit the named file in place, never create a parallel one._

- **Landing** `/` → `app/src/pages/Landing.tsx`
- **Login** `/login` → `app/src/pages/Login.tsx`
- **Signup** `/signup` → `app/src/pages/Signup.tsx`
- **ForgotPassword** `/forgot-password` → `app/src/pages/ForgotPassword.tsx`
- **ResetPassword** `/reset-password` → `app/src/pages/ResetPassword.tsx`
- **Dashboard** `/dashboard` (auth) → `app/src/pages/Dashboard.tsx`
- **Search** `/search` (auth) → `app/src/pages/Search.tsx`
- **Traces** `/traces` (auth) → `app/src/pages/Traces.tsx`
- **Streams** `/streams` (auth) → `app/src/pages/Streams.tsx`
- **Alerts** `/alerts` (auth) → `app/src/pages/Alerts.tsx`
- **Saved** `/saved` (auth) → `app/src/pages/Saved.tsx`
- **Settings** `/settings` (auth) → `app/src/pages/Settings.tsx`
- **TraceDetail** `/traces/:id` (auth) → `app/src/pages/TraceDetail.tsx`
- **StreamDetail** `/streams/:id` (auth) → `app/src/pages/StreamDetail.tsx`
- **AlertDetail** `/alerts/:id` (auth) → `app/src/pages/AlertDetail.tsx`
- **Incidents** `/incidents` (auth) → `app/src/pages/Incidents.tsx`
- **IncidentDetail** `/incidents/:id` (auth) → `app/src/pages/IncidentDetail.tsx`
- **Services** `/services` (auth) → `app/src/pages/Services.tsx`

## Subscription tiers

free / pro / team — gated by: maxLogs, maxSavedSearches, maxSources, advancedFeatures, canExport, retentionDays

## Integrations (13 @molecule/* packages)

- **Database**: `@molecule/api-database-postgresql`
- **Domain resources**: `@molecule/api-resource-user`, `@molecule/api-resource-project`
- **Frontend / UI**: `@molecule/app-data-table`, `@molecule/app-virtual-scroll`, `@molecule/app-command-palette`, `@molecule/app-keyboard-shortcuts`, `@molecule/app-code-editor-monaco`, `@molecule/app-date-range-picker`, `@molecule/app-charts`
- **Other API**: `@molecule/api-reporting-database`
- **Realtime**: `@molecule/api-realtime-sse`
- **Search**: `@molecule/api-search-meilisearch`

## Required secrets

- DATABASE_URL — PostgreSQL connection string
