# Smart Home Dashboard

- **slug**: `smart-home-dashboard`
- **cluster**: operations-iot
- **type**: full-stack
- **layout**: dashboard

Home Assistant-like app with devices, automations, scenes, and energy monitoring

> **This is a complete, working app, already built.** The data model, handlers, and screens below all exist on disk (paths shown). Treat this as the user's existing codebase: **adapt the listed files in place** for the request; do not recreate tables, handlers, or pages that already exist, and do not add packages for functionality already implemented here.

## Features

`auth`, `realtime`, `notifications`, `webhooks`, `cron`

## Data model (11 domain tables)

_Already created by the existing SQL in `api/migrations/` — do NOT add new migrations for these tables._

- **automation_logs** — id, automation_id, user_id, status, trigger_type, error_message, executed_at
- **automations** — id, user_id, name, description, trigger, conditions, actions, enabled, last_triggered, execution_count, created_at, updated_at
- **device_events** — id, device_id, user_id, event_type, triggered_by, scene_id, automation_id, timestamp
- **devices** — id, createdAt, updatedAt, userId, name, pushPlatform, pushSubscription, hasPushSubscription
- **energy_daily_summary** — id, user_id, date, total_kwh, peak_watts, estimated_cost
- **energy_monthly_summary** — id, user_id, month, total_kwh, peak_watts, estimated_cost
- **energy_readings** — id, user_id, device_id, watts, kilowatt_hours, voltage, current, recorded_at
- **iot_devices** — id, user_id, name, type, room, manufacturer, model, firmware_version, status, is_on, properties, created_at, …
- **rooms** — id, user_id, name, icon, floor, area_sqft, created_at, updated_at
- **scenes** — id, user_id, name, description, icon, device_states, last_activated, activation_count, created_at, updated_at
- **security_state** — user_id, mode, set_at, set_by

## API surface (handlers)

_These endpoints already exist — open and extend the named file, never recreate it._

- **activity** — `api/src/handlers/activity.ts`
- **automations** — `api/src/handlers/automations.ts`
- **devices** — `api/src/handlers/devices.ts`
- **energy** — `api/src/handlers/energy.ts`
- **rooms** — `api/src/handlers/rooms.ts`
- **scenes** — `api/src/handlers/scenes.ts`

## Screens (18)

_These pages already exist — edit the named file in place, never create a parallel one._

- **Landing** `/` → `app/src/pages/Landing.tsx`
- **Login** `/login` → `app/src/pages/Login.tsx`
- **Signup** `/signup` → `app/src/pages/Signup.tsx`
- **ForgotPassword** `/forgot-password` → `app/src/pages/ForgotPassword.tsx`
- **ResetPassword** `/reset-password` → `app/src/pages/ResetPassword.tsx`
- **Overview** `/overview` (auth) → `app/src/pages/Overview.tsx`
- **Rooms** `/rooms` (auth) → `app/src/pages/Rooms.tsx`
- **Scenes** `/scenes` (auth) → `app/src/pages/Scenes.tsx`
- **Automations** `/automations` (auth) → `app/src/pages/Automations.tsx`
- **Energy** `/energy` (auth) → `app/src/pages/Energy.tsx`
- **Settings** `/settings` (auth) → `app/src/pages/Settings.tsx`
- **Security** `/security` (auth) → `app/src/pages/Security.tsx`
- **Activity** `/activity` (auth) → `app/src/pages/Activity.tsx`
- **Floorplan** `/floorplan` (auth) → `app/src/pages/Floorplan.tsx`
- **RoomDetail** `/rooms/:id` (auth) → `app/src/pages/RoomDetail.tsx`
- **DeviceDetail** `/devices/:id` (auth) → `app/src/pages/DeviceDetail.tsx`
- **AutomationEditor** `/automations/:id/edit` (auth) → `app/src/pages/AutomationEditor.tsx`
- **AddDevice** `/devices/add` (auth) → `app/src/pages/AddDevice.tsx`

## Subscription tiers

free / pro / team — gated by: maxAutomations, maxDevices, maxEnergy, maxScenes, advancedFeatures, canExport, retentionDays

## Integrations (10 @molecule/* packages)

- **Database**: `@molecule/api-database-postgresql`
- **Domain resources**: `@molecule/api-resource-user`
- **Frontend / UI**: `@molecule/app-charts`, `@molecule/app-data-table`, `@molecule/app-command-palette`
- **Notifications**: `@molecule/api-push-notifications-web-push`
- **Other API**: `@molecule/api-cron-node-cron`, `@molecule/api-webhook-http`
- **Realtime**: `@molecule/api-realtime-socketio`, `@molecule/app-realtime-socketio`

## Required secrets

- DATABASE_URL — PostgreSQL connection string
