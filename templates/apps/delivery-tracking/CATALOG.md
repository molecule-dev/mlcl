# Delivery Tracking

- **slug**: `delivery-tracking`
- **cluster**: operations-iot
- **type**: full-stack
- **layout**: dashboard

AfterShip-like delivery tracking with shipments, status updates, map view, and notifications

> **This is a complete, working app, already built.** The data model, handlers, and screens below all exist on disk (paths shown). Treat this as the user's existing codebase: **adapt the listed files in place** for the request; do not recreate tables, handlers, or pages that already exist, and do not add packages for functionality already implemented here.

## Features

`auth`, `search`, `realtime`, `map`, `notifications`, `webhooks`

## Data model (11 domain tables)

_Already created by the existing SQL in `api/migrations/` — do NOT add new migrations for these tables._

- **alerts** — id, user_id, shipment_id, type, severity, message, read_at, created_at
- **carriers** — id, name, code, tracking_url_template, webhook_url, logo_url, base_url, status, created_at, updated_at
- **devices** — id, createdAt, updatedAt, userId, name, pushPlatform, pushSubscription, hasPushSubscription
- **notification_log** — id, user_id, type, payload, sent_at, created_at
- **notification_preferences** — id, user_id, email_on_delivered, email_on_exception, push_on_status_change, created_at, updated_at
- **payments** — id, createdAt, updatedAt, userId, transactionId, productId, platformKey, data, receipt
- **shipments** — id, user_id, tracking_number, carrier_id, recipient_name, recipient_email, origin, destination, current_location, current_latitude, current_longitude, status, …
- **team_members** — id, owner_user_id, member_user_id, email, role, status, invited_at, joined_at, created_at
- **tracking_events** — id, shipment_id, status, description, location, latitude, longitude, raw, timestamp, created_at
- **webhook_events** — id, webhook_id, user_id, payload, attempts, last_error, delivered_at, created_at
- **webhooks** — id, user_id, url, events, secret, status, created_at, updated_at

## API surface (handlers)

_These endpoints already exist — open and extend the named file, never recreate it._

- **\_seed** — `api/src/handlers/_seed.ts`
- **\_test** — `api/src/handlers/_test.ts`
- **alerts** — `api/src/handlers/alerts.ts`
- **carriers** — `api/src/handlers/carriers.ts`
- **events** — `api/src/handlers/events.ts`
- **notifications** — `api/src/handlers/notifications.ts`
- **reports** — `api/src/handlers/reports.ts`
- **settings** — `api/src/handlers/settings.ts`
- **shipments** — `api/src/handlers/shipments.ts`
- **team** — `api/src/handlers/team.ts`
- **tracking** — `api/src/handlers/tracking.ts`
- **webhook-events** — `api/src/handlers/webhook-events.ts`
- **webhooks** — `api/src/handlers/webhooks.ts`

## Screens (16)

_These pages already exist — edit the named file in place, never create a parallel one._

- **Landing** `/` → `app/src/pages/Landing.tsx`
- **Login** `/login` → `app/src/pages/Login.tsx`
- **Signup** `/signup` → `app/src/pages/Signup.tsx`
- **ForgotPassword** `/forgot-password` → `app/src/pages/ForgotPassword.tsx`
- **ResetPassword** `/reset-password` → `app/src/pages/ResetPassword.tsx`
- **Dashboard** `/dashboard` (auth) → `app/src/pages/Dashboard.tsx`
- **Shipments** `/shipments` (auth) → `app/src/pages/Shipments.tsx`
- **ShipmentDetail** `/shipments/:id` (auth) → `app/src/pages/ShipmentDetail.tsx`
- **Carriers** `/carriers` (auth) → `app/src/pages/Carriers.tsx`
- **Webhooks** `/webhooks` (auth) → `app/src/pages/Webhooks.tsx`
- **Settings** `/settings` (auth) → `app/src/pages/Settings.tsx`
- **CarrierDetail** `/carriers/:id` (auth) → `app/src/pages/CarrierDetail.tsx`
- **Alerts** `/alerts` (auth) → `app/src/pages/Alerts.tsx`
- **Analytics** `/analytics` (auth) → `app/src/pages/Analytics.tsx`
- **Profile** `/profile` (auth) → `app/src/pages/Profile.tsx`
- **Team** `/team` (auth) → `app/src/pages/Team.tsx`

## Subscription tiers

free / pro / team — gated by: maxCarriers, maxNotifications, maxShipments, maxTracking, advancedFeatures, canExport, retentionDays

## Integrations (14 @molecule/* packages)

- **Database**: `@molecule/api-database-postgresql`
- **Domain resources**: `@molecule/api-resource-user`
- **Email**: `@molecule/api-emails-mailgun`
- **Frontend / UI**: `@molecule/app-data-table`, `@molecule/app-maps`, `@molecule/app-virtual-scroll`, `@molecule/app-command-palette`
- **Notifications**: `@molecule/api-push-notifications-web-push`
- **Other API**: `@molecule/api-cron-node-cron`, `@molecule/api-webhook-http`, `@molecule/api-geolocation-nominatim`
- **Realtime**: `@molecule/api-realtime-socketio`, `@molecule/app-realtime-socketio`
- **Search**: `@molecule/api-search-meilisearch`

## Required secrets

- DATABASE_URL — PostgreSQL connection string
- MEILISEARCH_API_KEY — MeiliSearch API key
- MAILGUN_API_KEY — Mailgun API key for notifications
- MAILGUN_DOMAIN — Mailgun sending domain
