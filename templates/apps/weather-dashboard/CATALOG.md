# Weather Dashboard

- **slug**: `weather-dashboard`
- **cluster**: operations-iot
- **type**: full-stack
- **layout**: dashboard

Weather.com-like app with forecasts, alerts, saved locations, and historical data

> **This is a complete, working app, already built.** The data model, handlers, and screens below all exist on disk (paths shown). Treat this as the user's existing codebase: **adapt the listed files in place** for the request; do not recreate tables, handlers, or pages that already exist, and do not add packages for functionality already implemented here.

## Features

`auth`, `geolocation`, `caching`, `alerts`, `charts`, `maps`, `history`

## Data model (11 domain tables)

_Already created by the existing SQL in `api/migrations/` — do NOT add new migrations for these tables._

- **alert_preferences** — id, user_id, location_id, enabled, min_severity, kinds, channels, quiet_hours, created_at, updated_at
- **alerts** — id, location_id, kind, title, body, severity, severity_rank, source, status, starts_at, ends_at, created_at, …
- **devices** — id, createdAt, updatedAt, userId, name, pushPlatform, pushSubscription, hasPushSubscription
- **dismissed_alerts** — id, alert_id, user_id, dismissed_at
- **forecast_current** — id, location_id, observed_at, temperature, feels_like, condition, icon, humidity, wind_speed, wind_dir, pressure, visibility, …
- **forecast_daily** — id, location_id, day_at, temp_high, temp_low, condition, icon, precipitation_pct, humidity, wind_speed, sunrise, sunset, …
- **forecast_hourly** — id, location_id, hour_at, temperature, feels_like, condition, icon, precipitation_pct, humidity, wind_speed, fetched_at
- **history_observations** — id, location_id, observed_date, temp_high, temp_low, temp_avg, precipitation_mm, precipitation_type, wind_speed_avg, wind_speed_max, wind_dir, pressure, …
- **locations** — id, user_id, name, region, address, latitude, longitude, timezone, is_default, forecast_stale, created_at, updated_at
- **notifications** — id, user_id, type, title, body, href, read, created_at
- **payments** — id, createdAt, updatedAt, userId, transactionId, productId, platformKey, data, receipt

## API surface (handlers)

_These endpoints already exist — open and extend the named file, never recreate it._

- **alerts** — `api/src/handlers/alerts.ts`
- **forecasts** — `api/src/handlers/forecasts.ts`
- **history** — `api/src/handlers/history.ts`
- **locations** — `api/src/handlers/locations.ts`

## Screens (13)

_These pages already exist — edit the named file in place, never create a parallel one._

- **Landing** `/` → `app/src/pages/Landing.tsx`
- **Login** `/login` → `app/src/pages/Login.tsx`
- **Signup** `/signup` → `app/src/pages/Signup.tsx`
- **ForgotPassword** `/forgot-password` → `app/src/pages/ForgotPassword.tsx`
- **ResetPassword** `/reset-password` → `app/src/pages/ResetPassword.tsx`
- **Dashboard** `/dashboard` (auth) → `app/src/pages/Dashboard.tsx`
- **LocationDetail** `/location/:id` (auth) → `app/src/pages/LocationDetail.tsx`
- **Locations** `/locations` (auth) → `app/src/pages/Locations.tsx`
- **Radar** `/radar` (auth) → `app/src/pages/Radar.tsx`
- **Alerts** `/alerts` (auth) → `app/src/pages/Alerts.tsx`
- **Settings** `/settings` (auth) → `app/src/pages/Settings.tsx`
- **Trends** `/trends` (auth) → `app/src/pages/Trends.tsx`
- **Compare** `/compare` (auth) → `app/src/pages/Compare.tsx`

## Subscription tiers

free / pro / team — gated by: maxAlerts, maxForecasts, maxHistory, maxLocations, advancedFeatures, canExport, retentionDays

## Integrations (11 @molecule/* packages)

- **Database**: `@molecule/api-database-postgresql`
- **Domain resources**: `@molecule/api-resource-user`
- **Frontend / UI**: `@molecule/app-charts`, `@molecule/app-maps`, `@molecule/app-data-table`, `@molecule/app-command-palette`
- **Notifications**: `@molecule/api-push-notifications-web-push`
- **Other API**: `@molecule/api-geolocation-nominatim`, `@molecule/api-cron-node-cron`, `@molecule/api-cache-redis`, `@molecule/api-weather-open-meteo`

## Required secrets

- DATABASE_URL — PostgreSQL connection string
