# Webhook Manager

- **slug**: `webhook-manager`
- **cluster**: developer-tools
- **type**: full-stack
- **layout**: dashboard

Webhook management with endpoint registration, payload testing, delivery logs, and automatic retries

> **This is a complete, working app, already built.** The data model, handlers, and screens below all exist on disk (paths shown). Treat this as the user's existing codebase: **adapt the listed files in place** for the request; do not recreate tables, handlers, or pages that already exist, and do not add packages for functionality already implemented here.

## Features

`auth`, `search`

## Data model (10 domain tables)

_Already created by the existing SQL in `api/migrations/` — do NOT add new migrations for these tables._

- **api_keys** — id, user_id, name, key_hash, key_masked, scopes, is_revoked, last_used_at, created_at, updated_at, updatedAt
- **audit_events** — id, user_id, action, actor, actor_type, target, ip_address, metadata, occurred_at, created_at, updatedAt
- **devices** — id, createdAt, updatedAt, userId, name, pushPlatform, pushSubscription, hasPushSubscription
- **events** — id, user_id, name, category, description, payload, fanout_endpoints, delivery_status, occurred_at, created_at, updatedAt
- **notifications** — id, user_id, endpoint_id, type, severity, title, body, is_read, created_at, updatedAt
- **team_members** — id, user_id, member_id, name, email, role, status, last_active_at, created_at, updated_at, updatedAt
- **webhook_deliveries** — id, user_id, webhook_id, event_id, event_type, method, url, request_headers, request_body, response_headers, response_body, status, …
- **webhook_event_types** — id, user_id, name, description, payload_schema, created_at, updated_at, updatedAt
- **webhooks** — id, user_id, name, description, url, content_type, events, secret, secret_masked, retry_count, is_active, last_delivered_at, …
- **payments** — id, createdAt, updatedAt, userId, transactionId, productId, platformKey, data, receipt

## API surface (handlers)

_These endpoints already exist — open and extend the named file, never recreate it._

- **\_audit** — `api/src/handlers/_audit.ts`
- **\_deliver** — `api/src/handlers/_deliver.ts`
- **api_keys** — `api/src/handlers/api_keys.ts`
- **audit_events** — `api/src/handlers/audit_events.ts`
- **deliveries** — `api/src/handlers/deliveries.ts`
- **events** — `api/src/handlers/events.ts`
- **notifications** — `api/src/handlers/notifications.ts`
- **profile** — `api/src/handlers/profile.ts`
- **team_members** — `api/src/handlers/team_members.ts`
- **webhooks** — `api/src/handlers/webhooks.ts`

## Screens (21)

_These pages already exist — edit the named file in place, never create a parallel one._

- **Landing** `/` → `app/src/pages/Landing.tsx`
- **Login** `/login` → `app/src/pages/Login.tsx`
- **Signup** `/signup` → `app/src/pages/Signup.tsx`
- **ForgotPassword** `/forgot-password` → `app/src/pages/ForgotPassword.tsx`
- **ResetPassword** `/reset-password` → `app/src/pages/ResetPassword.tsx`
- **Dashboard** `/dashboard` (auth) → `app/src/pages/Dashboard.tsx`
- **Endpoints** `/endpoints` (auth) → `app/src/pages/Endpoints.tsx`
- **EndpointDetail** `/endpoints/:id` (auth) → `app/src/pages/EndpointDetail.tsx`
- **Deliveries** `/deliveries` (auth) → `app/src/pages/Deliveries.tsx`
- **Events** `/events` (auth) → `app/src/pages/Events.tsx`
- **Settings** `/settings` (auth) → `app/src/pages/Settings.tsx`
- **DeliveryDetail** `/deliveries/:id` (auth) → `app/src/pages/DeliveryDetail.tsx`
- **EventDetail** `/events/:id` (auth) → `app/src/pages/EventDetail.tsx`
- **NewEndpoint** `/endpoints/new` (auth) → `app/src/pages/NewEndpoint.tsx`
- **Notifications** `/notifications` (auth) → `app/src/pages/Notifications.tsx`
- **AuditLog** `/audit` (auth) → `app/src/pages/AuditLog.tsx`
- **APIKeys** `/settings/api-keys` (auth) → `app/src/pages/APIKeys.tsx`
- **Team** `/settings/team` (auth) → `app/src/pages/Team.tsx`
- **Billing** `/settings/billing` (auth) → `app/src/pages/Billing.tsx`
- **Profile** `/profile` (auth) → `app/src/pages/Profile.tsx`
- **NotFound** `*` → `app/src/pages/NotFound.tsx`

## Subscription tiers

free / pro / team — gated by: maxDeliveries, maxEvents, maxWebhooks, advancedFeatures, canExport, retentionDays

## Integrations (12 @molecule/* packages)

- **Database**: `@molecule/api-database-postgresql`
- **Domain resources**: `@molecule/api-resource-user`
- **Frontend / UI**: `@molecule/app-data-table`, `@molecule/app-code-editor-monaco`, `@molecule/app-command-palette`, `@molecule/app-keyboard-shortcuts`, `@molecule/app-virtual-scroll`
- **Other API**: `@molecule/api-http-fetch`, `@molecule/api-webhook-http`, `@molecule/api-queue-redis`, `@molecule/api-encryption-aes`
- **Search**: `@molecule/api-search-meilisearch`

## Required secrets

- DATABASE_URL — PostgreSQL connection string
