# Energy Monitoring

- **slug**: `energy-monitoring`
- **cluster**: operations-iot
- **type**: full-stack
- **layout**: dashboard

Sense-like energy monitoring with usage tracking, solar production, cost analysis, alerts, and consumption trends

> **This is a complete, working app, already built.** The data model, handlers, and screens below all exist on disk (paths shown). Treat this as the user's existing codebase: **adapt the listed files in place** for the request; do not recreate tables, handlers, or pages that already exist, and do not add packages for functionality already implemented here.

## Features

`auth`, `reporting`, `alerts`, `charts`, `date-range`, `push-notifications`

## Data model (10 domain tables)

_Already created by the existing SQL in `api/migrations/` — do NOT add new migrations for these tables._

- **alert_rules** — id, user_id, name, meter_id, type, threshold, comparison, notify_email, enabled, created_at, updated_at
- **devices** — id, createdAt, updatedAt, userId, name, pushPlatform, pushSubscription, hasPushSubscription
- **energy_alerts** — id, user_id, rule_id, meter_id, type, severity, message, status, value, threshold, acknowledged_by, acknowledged_at, …
- **energy_daily_summary** — id, user_id, meter_id, date, total_kwh, peak_kwh, off_peak_kwh, reading_count, created_at
- **energy_monthly_summary** — id, user_id, meter_id, year, month, total_kwh, total_cost, reading_count, created_at
- **meter_tokens** — id, meter_id, user_id, token_hash, label, enabled, last_used_at, created_at, revoked_at
- **meters** — id, user_id, name, type, location, unit, description, status, created_at, updated_at
- **rate_plans** — id, user_id, name, rate_per_kwh, peak_rate, off_peak_rate, peak_start_hour, peak_end_hour, currency, effective_date, status, created_at, …
- **readings** — id, meter_id, value, unit, timestamp, created_at
- **payments** — id, createdAt, updatedAt, userId, transactionId, productId, platformKey, data, receipt

## API surface (handlers)

_These endpoints already exist — open and extend the named file, never recreate it._

- **\_seed** — `api/src/handlers/_seed.ts`
- **alerts** — `api/src/handlers/alerts.ts`
- **costs** — `api/src/handlers/costs.ts`
- **me** — `api/src/handlers/me.ts`
- **meters** — `api/src/handlers/meters.ts`
- **readings** — `api/src/handlers/readings.ts`

## Screens (13)

_These pages already exist — edit the named file in place, never create a parallel one._

- **Login** `/login` → `app/src/pages/Login.tsx`
- **Signup** `/signup` → `app/src/pages/Signup.tsx`
- **ForgotPassword** `/forgot-password` → `app/src/pages/ForgotPassword.tsx`
- **ResetPassword** `/reset-password` → `app/src/pages/ResetPassword.tsx`
- **Dashboard** `/dashboard` (auth) → `app/src/pages/Dashboard.tsx`
- **Devices** `/devices` (auth) → `app/src/pages/Devices.tsx`
- **Reports** `/reports` (auth) → `app/src/pages/Reports.tsx`
- **Alerts** `/alerts` (auth) → `app/src/pages/Alerts.tsx`
- **Settings** `/settings` (auth) → `app/src/pages/Settings.tsx`
- **DeviceDetail** `/devices/:id` (auth) → `app/src/pages/DeviceDetail.tsx`
- **AlertRule** `/alerts/rules/new` (auth) → `app/src/pages/AlertRule.tsx`
- **Profile** `/profile` (auth) → `app/src/pages/Profile.tsx`
- **Billing** `/billing` (auth) → `app/src/pages/Billing.tsx`

## Subscription tiers

free / pro / team — gated by: maxAlerts, maxCosts, maxMeters, maxReadings, advancedFeatures, canExport, retentionDays

## Integrations (11 @molecule/* packages)

- **Database**: `@molecule/api-database-postgresql`
- **Domain resources**: `@molecule/api-resource-user`
- **Email**: `@molecule/api-emails-mailgun`
- **Frontend / UI**: `@molecule/app-charts`, `@molecule/app-data-table`, `@molecule/app-date-range-picker`, `@molecule/app-virtual-scroll`, `@molecule/app-command-palette`
- **Notifications**: `@molecule/api-push-notifications-web-push`
- **Other API**: `@molecule/api-reporting-database`, `@molecule/api-cron-node-cron`

## Required secrets

- DATABASE_URL — PostgreSQL connection string
- MAILGUN_API_KEY — Mailgun API key for alert emails
- MAILGUN_DOMAIN — Mailgun sending domain
