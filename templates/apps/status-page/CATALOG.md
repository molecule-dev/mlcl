# Status Page

- **slug**: `status-page`
- **cluster**: developer-tools
- **type**: full-stack
- **layout**: landing

Statuspage-like with incidents, component monitoring, uptime history, and subscriber notifications

> **This is a complete, working app, already built.** The data model, handlers, and screens below all exist on disk (paths shown). Treat this as the user's existing codebase: **adapt the listed files in place** for the request; do not recreate tables, handlers, or pages that already exist, and do not add packages for functionality already implemented here.

## Features

`auth`, `notifications`

## Data model (14 domain tables)

_Already created by the existing SQL in `api/migrations/` — do NOT add new migrations for these tables._

- **audit_log** — id, user_id, actor_user_id, action, scope, target, summary, payload, occurred_at, created_at, updatedAt
- **checks** — id, serviceId, status, httpStatus, latencyMs, error, checkedAt
- **component_status_history** — id, component_id, status, changed_at, created_at, updatedAt
- **devices** — id, createdAt, updatedAt, userId, name, pushPlatform, pushSubscription, hasPushSubscription
- **incident_updates** — id, incident_id, status, message, posted_by, created_at, updatedAt
- **incidents** — id, createdAt, updatedAt, serviceId, title, description, severity, status, autoDetected, startedAt, resolvedAt, user_id, …
- **maintenance** — id, user_id, title, message, scheduled_for, scheduled_until, duration_minutes, affected_components, status, scheduled_by, created_at, updated_at, …
- **notifications** — id, user_id, kind, title, body, payload, read_at, created_at, updatedAt
- **services** — id, createdAt, updatedAt, name, url, method, expectedStatus, timeoutMs, intervalMs, groupName, enabled
- **status_components** — id, user_id, name, description, group, status, monitor_url, uptime_pct_90, sort_order, created_at, updated_at, updatedAt, …
- **status_subscribers** — id, user_id, channel, destination, email, notification_type, components, is_confirmed, confirm_token, unsubscribe_token, created_at, updated_at, …
- **team_members** — id, user_id, member_id, name, email, role, on_call, shift, tz, avatar_initial, created_at, updated_at, …
- **uptimeWindows** — id, serviceId, window, uptimePct, totalChecks, upChecks, avgLatencyMs
- **payments** — id, createdAt, updatedAt, userId, transactionId, productId, platformKey, data, receipt

## API surface (handlers)

_These endpoints already exist — open and extend the named file, never recreate it._

- **\_audit** — `api/src/handlers/_audit.ts`
- **audit** — `api/src/handlers/audit.ts`
- **components** — `api/src/handlers/components.ts`
- **incidents** — `api/src/handlers/incidents.ts`
- **maintenance** — `api/src/handlers/maintenance.ts`
- **notifications** — `api/src/handlers/notifications.ts`
- **public** — `api/src/handlers/public.ts`
- **subscribers** — `api/src/handlers/subscribers.ts`
- **team** — `api/src/handlers/team.ts`

## Screens (19)

_These pages already exist — edit the named file in place, never create a parallel one._

- **PublicStatus** `/` → `app/src/pages/PublicStatus.tsx`
- **Login** `/login` → `app/src/pages/Login.tsx`
- **Signup** `/signup` → `app/src/pages/Signup.tsx`
- **ForgotPassword** `/forgot-password` → `app/src/pages/ForgotPassword.tsx`
- **ResetPassword** `/reset-password` → `app/src/pages/ResetPassword.tsx`
- **Dashboard** `/dashboard` (auth) → `app/src/pages/Dashboard.tsx`
- **IncidentList** `/incidents` (auth) → `app/src/pages/IncidentList.tsx`
- **IncidentDetail** `/incidents/:id` (auth) → `app/src/pages/IncidentDetail.tsx`
- **Components** `/components` (auth) → `app/src/pages/Components.tsx`
- **Subscribers** `/subscribers` (auth) → `app/src/pages/Subscribers.tsx`
- **Settings** `/settings` (auth) → `app/src/pages/Settings.tsx`
- **IncidentForm** `/incidents/new` (auth) → `app/src/pages/IncidentForm.tsx`
- **ComponentDetail** `/components/:id` (auth) → `app/src/pages/ComponentDetail.tsx`
- **MaintenanceList** `/maintenance` (auth) → `app/src/pages/MaintenanceList.tsx`
- **MaintenanceDetail** `/maintenance/:id` (auth) → `app/src/pages/MaintenanceDetail.tsx`
- **Profile** `/profile` (auth) → `app/src/pages/Profile.tsx`
- **Notifications** `/notifications` (auth) → `app/src/pages/Notifications.tsx`
- **Team** `/team` (auth) → `app/src/pages/Team.tsx`
- **AuditLog** `/audit` (auth) → `app/src/pages/AuditLog.tsx`

## Subscription tiers

free / pro / team — gated by: maxComponents, maxIncidents, maxSubscribers, advancedFeatures, canExport, retentionDays

## Integrations (12 @molecule/* packages)

- **Database**: `@molecule/api-database-postgresql`
- **Domain resources**: `@molecule/api-resource-user`, `@molecule/api-resource-status-page`
- **Email**: `@molecule/api-emails-mailgun`
- **Frontend / UI**: `@molecule/app-data-table`, `@molecule/app-charts`, `@molecule/app-timeline`, `@molecule/app-badge`, `@molecule/app-virtual-scroll`
- **Notifications**: `@molecule/api-notifications-webhook`
- **Other API**: `@molecule/api-cron-node-cron`, `@molecule/api-http-fetch`

## Required secrets

- DATABASE_URL — PostgreSQL connection string
