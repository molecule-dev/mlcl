# IoT Device Manager

- **slug**: `iot-device-manager`
- **cluster**: operations-iot
- **type**: full-stack
- **layout**: admin

AWS IoT-like platform with device registry, telemetry ingestion, remote commands, and firmware update management

> **This is a complete, working app, already built.** The data model, handlers, and screens below all exist on disk (paths shown). Treat this as the user's existing codebase: **adapt the listed files in place** for the request; do not recreate tables, handlers, or pages that already exist, and do not add packages for functionality already implemented here.

## Features

`auth`, `search`, `realtime`, `charts`, `reporting`, `alerts`

## Data model (12 domain tables)

_Already created by the existing SQL in `api/migrations/` — do NOT add new migrations for these tables._

- **device_alerts** — id, owner_id, device_id, type, severity, message, status, metadata, acknowledged_at, resolved_at, created_at, updated_at
- **device_commands** — id, device_id, command_type, payload, priority, status, result, error_message, acknowledged_at, completed_at, created_at, updated_at
- **device_logs** — id, device_id, level, source, message, metadata, created_at
- **device_tokens** — id, device_id, owner_id, token_hash, label, enabled, last_used_at, created_at, revoked_at
- **devices** — id, createdAt, updatedAt, userId, name, pushPlatform, pushSubscription, hasPushSubscription
- **firmware_rollouts** — id, owner_id, firmware_id, fleet_id, device_ids, strategy, status, target_count, completed_count, failed_count, progress_percent, created_at, …
- **firmware_update_tasks** — id, rollout_id, firmware_id, device_id, status, error_message, completed_at, created_at, updated_at
- **firmware_versions** — id, owner_id, version, device_type, release_notes, download_url, checksum, file_size, status, released_at, created_at, updated_at
- **fleet_memberships** — id, fleet_id, device_id, created_at
- **fleets** — id, owner_id, name, description, tags, created_at, updated_at
- **iot_devices** — id, owner_id, name, device_type, serial_number, firmware_version, status, last_seen, metadata, created_at, updated_at
- **telemetry** — id, device_id, metric, value, unit, metadata, recorded_at

## API surface (handlers)

_These endpoints already exist — open and extend the named file, never recreate it._

- **alerts** — `api/src/handlers/alerts.ts`
- **commands** — `api/src/handlers/commands.ts`
- **devices** — `api/src/handlers/devices.ts`
- **firmware** — `api/src/handlers/firmware.ts`
- **fleets** — `api/src/handlers/fleets.ts`
- **logs** — `api/src/handlers/logs.ts`
- **reports** — `api/src/handlers/reports.ts`
- **telemetry** — `api/src/handlers/telemetry.ts`

## Screens (13)

_These pages already exist — edit the named file in place, never create a parallel one._

- **Landing** `/` → `app/src/pages/Landing.tsx`
- **Login** `/login` → `app/src/pages/Login.tsx`
- **Signup** `/signup` → `app/src/pages/Signup.tsx`
- **ForgotPassword** `/forgot-password` → `app/src/pages/ForgotPassword.tsx`
- **ResetPassword** `/reset-password` → `app/src/pages/ResetPassword.tsx`
- **Dashboard** `/dashboard` (auth) → `app/src/pages/Dashboard.tsx`
- **Devices** `/devices` (auth) → `app/src/pages/Devices.tsx`
- **DeviceDetail** `/devices/:id` (auth) → `app/src/pages/DeviceDetail.tsx`
- **Fleets** `/fleets` (auth) → `app/src/pages/Fleets.tsx`
- **Firmware** `/firmware` (auth) → `app/src/pages/Firmware.tsx`
- **Alerts** `/alerts` (auth) → `app/src/pages/Alerts.tsx`
- **Console** `/console` (auth) → `app/src/pages/Console.tsx`
- **Settings** `/settings` (auth) → `app/src/pages/Settings.tsx`

## Subscription tiers

free / pro / team — gated by: maxCommands, maxDevices, maxFirmware, maxTelemetry, advancedFeatures, canExport, retentionDays

## Integrations (12 @molecule/* packages)

- **Database**: `@molecule/api-database-postgresql`
- **Domain resources**: `@molecule/api-resource-user`
- **Frontend / UI**: `@molecule/app-data-table`, `@molecule/app-charts`, `@molecule/app-virtual-scroll`, `@molecule/app-command-palette`
- **Notifications**: `@molecule/api-push-notifications-web-push`
- **Other API**: `@molecule/api-cron-node-cron`, `@molecule/api-reporting-database`
- **Realtime**: `@molecule/api-realtime-socketio`, `@molecule/app-realtime-socketio`
- **Search**: `@molecule/api-search-meilisearch`

## Required secrets

- DATABASE_URL — PostgreSQL connection string
- MEILISEARCH_API_KEY — MeiliSearch API key
