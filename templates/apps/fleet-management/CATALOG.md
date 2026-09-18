# Fleet Management

- **slug**: `fleet-management`
- **cluster**: operations-iot
- **type**: full-stack
- **layout**: admin

Samsara-like fleet management with vehicles, routes, maintenance scheduling, and driver management

> **This is a complete, working app, already built.** The data model, handlers, and screens below all exist on disk (paths shown). Treat this as the user's existing codebase: **adapt the listed files in place** for the request; do not recreate tables, handlers, or pages that already exist, and do not add packages for functionality already implemented here.

## Features

`auth`, `search`, `realtime`, `map`, `calendar`, `reporting`, `alerts`

## Data model (14 domain tables)

_Already created by the existing SQL in `api/migrations/` — do NOT add new migrations for these tables._

- **alerts** — id, owner_id, kind, severity, vehicle_id, driver_id, message, occurred_at, acknowledged_at, acknowledged_by, payload, created_at, …
- **devices** — id, createdAt, updatedAt, userId, name, pushPlatform, pushSubscription, hasPushSubscription
- **driver_hours** — id, driver_id, hours, date, notes, created_at, updatedAt
- **drivers** — id, owner_id, user_id, name, email, phone, license_number, license_expiry, status, assigned_vehicle_id, hours_today, score, …
- **fleet_routes** — id, owner_id, name, vehicle_id, driver_id, scheduled_date, status, total_distance, planned_distance_km, planned_duration_seconds, started_at, completed_at, …
- **geofences** — id, owner_id, name, kind, polygon_json, alert_on_enter, alert_on_exit, min_lat, max_lat, min_lng, max_lng, created_at, …
- **maintenance_records** — id, owner_id, vehicle_id, type, kind, description, scheduled_date, scheduled_at, started_at, completed_at, completed_by, estimated_cost, …
- **notifications** — id, user_id, kind, title, body, link, payload, read_at, created_at, updatedAt
- **payments** — id, createdAt, updatedAt, userId, transactionId, productId, platformKey, data, receipt
- **route_stops** — id, route_id, sequence, address, latitude, longitude, estimated_arrival, actual_arrival, status, notes, created_at, updatedAt
- **trip_events** — id, trip_id, kind, occurred_at, latitude, longitude, payload, created_at, updatedAt
- **trips** — id, owner_id, vehicle_id, driver_id, route_id, started_at, ended_at, distance_km, duration_seconds, idle_seconds, fuel_used_liters, start_latitude, …
- **vehicle_locations** — id, vehicle_id, latitude, longitude, speed, heading, timestamp, created_at, updatedAt
- **vehicles** — id, owner_id, name, vin, license_plate, make, model, year, type, fuel_type, status, mileage, …

## API surface (handlers)

_These endpoints already exist — open and extend the named file, never recreate it._

- **\_seed** — `api/src/handlers/_seed.ts`
- **\_shape** — `api/src/handlers/_shape.ts`
- **alerts** — `api/src/handlers/alerts.ts`
- **drivers** — `api/src/handlers/drivers.ts`
- **geofences** — `api/src/handlers/geofences.ts`
- **maintenance** — `api/src/handlers/maintenance.ts`
- **notifications** — `api/src/handlers/notifications.ts`
- **reports** — `api/src/handlers/reports.ts`
- **routes** — `api/src/handlers/routes.ts`
- **trips** — `api/src/handlers/trips.ts`
- **vehicles** — `api/src/handlers/vehicles.ts`

## Screens (18)

_These pages already exist — edit the named file in place, never create a parallel one._

- **Landing** `/` → `app/src/pages/Landing.tsx`
- **Login** `/login` → `app/src/pages/Login.tsx`
- **Signup** `/signup` → `app/src/pages/Signup.tsx`
- **ForgotPassword** `/forgot-password` → `app/src/pages/ForgotPassword.tsx`
- **ResetPassword** `/reset-password` → `app/src/pages/ResetPassword.tsx`
- **Dashboard** `/dashboard` (auth) → `app/src/pages/Dashboard.tsx`
- **Vehicles** `/vehicles` (auth) → `app/src/pages/Vehicles.tsx`
- **VehicleDetail** `/vehicles/:id` (auth) → `app/src/pages/VehicleDetail.tsx`
- **Drivers** `/drivers` (auth) → `app/src/pages/Drivers.tsx`
- **Maintenance** `/maintenance` (auth) → `app/src/pages/Maintenance.tsx`
- **Alerts** `/alerts` (auth) → `app/src/pages/Alerts.tsx`
- **Reports** `/reports` (auth) → `app/src/pages/Reports.tsx`
- **Settings** `/settings` (auth) → `app/src/pages/Settings.tsx`
- **DriverDetail** `/drivers/:id` (auth) → `app/src/pages/DriverDetail.tsx`
- **Routes** `/routes` (auth) → `app/src/pages/Routes.tsx`
- **Trips** `/trips` (auth) → `app/src/pages/Trips.tsx`
- **Geofences** `/geofences` (auth) → `app/src/pages/Geofences.tsx`
- **MaintenanceDetail** `/maintenance/:id` (auth) → `app/src/pages/MaintenanceDetail.tsx`

## Subscription tiers

free / pro / team — gated by: maxDrivers, maxMaintenance, maxRoutes, maxVehicles, advancedFeatures, canExport, retentionDays

## Integrations (15 @molecule/* packages)

- **Database**: `@molecule/api-database-postgresql`
- **Domain resources**: `@molecule/api-resource-user`
- **Email**: `@molecule/api-emails-mailgun`
- **Frontend / UI**: `@molecule/app-data-table`, `@molecule/app-maps`, `@molecule/app-charts`, `@molecule/app-calendar`, `@molecule/app-command-palette`
- **Notifications**: `@molecule/api-push-notifications-web-push`
- **Other API**: `@molecule/api-geolocation-nominatim`, `@molecule/api-cron-node-cron`, `@molecule/api-reporting-database`
- **Realtime**: `@molecule/api-realtime-socketio`, `@molecule/app-realtime-socketio`
- **Search**: `@molecule/api-search-meilisearch`

## Required secrets

- DATABASE_URL — PostgreSQL connection string
- MEILISEARCH_API_KEY — MeiliSearch API key
- MAILGUN_API_KEY — Mailgun API key for maintenance alerts
- MAILGUN_DOMAIN — Mailgun sending domain
