# Transit Tracker

- **slug**: `transit-tracker`
- **cluster**: civic
- **type**: full-stack
- **layout**: landing

Citymapper-like transit tracker with stops, routes, live arrival boards (simulated feed), service alerts, and a trip planner — with built-in Stripe-backed subscription tiers

> **This is a complete, working app, already built.** The data model, handlers, and screens below all exist on disk (paths shown). Treat this as the user's existing codebase: **adapt the listed files in place** for the request; do not recreate tables, handlers, or pages that already exist, and do not add packages for functionality already implemented here.

## Features

`auth`, `live-arrivals`, `trip-planner`, `service-alerts`, `saved-stops`, `subscriptions`

## Data model (9 domain tables)

_Already created by the existing SQL in `api/migrations/` — do NOT add new migrations for these tables._

- **devices** — id, createdAt, updatedAt, userId, name, pushPlatform, pushSubscription, hasPushSubscription
- **transit_lines** — code, name, kind, color, polyline, created_at
- **transit_stops** — code, name, lat, lng, hub, created_at
- **transit_stop_positions** — line_code, stop_code, sequence, travel_seconds_from_prev
- **transit_schedules** — id, line_code, direction, first_departure, last_departure, headway_seconds
- **transit_alerts** — id, line_code, severity, title, body, starts_at, ends_at, created_at
- **saved_stops** — id, user_id, stop_code, created_at
- **payments** — id, createdAt, updatedAt, userId, transactionId, productId, platformKey, data, receipt
- **notifications** — id, user_id, type, title, body, icon, read, created_at

## API surface (handlers)

_These endpoints already exist — open and extend the named file, never recreate it._

- **\_seed** — `api/src/handlers/_seed.ts`
- **alerts** — `api/src/handlers/alerts.ts`
- **arrivals** — `api/src/handlers/arrivals.ts`
- **network** — `api/src/handlers/network.ts`
- **notifications** — `api/src/handlers/notifications.ts`
- **preferences** — `api/src/handlers/preferences.ts`
- **saved-stops** — `api/src/handlers/saved-stops.ts`
- **trips** — `api/src/handlers/trips.ts`

## Screens (16)

_These pages already exist — edit the named file in place, never create a parallel one._

- **Landing** `/` → `app/src/pages/Landing.tsx`
- **Login** `/login` → `app/src/pages/Login.tsx`
- **Signup** `/signup` → `app/src/pages/Signup.tsx`
- **ForgotPassword** `/forgot-password` → `app/src/pages/ForgotPassword.tsx`
- **ResetPassword** `/reset-password` → `app/src/pages/ResetPassword.tsx`
- **Nearby** `/nearby` (auth) → `app/src/pages/Nearby.tsx`
- **StopBoard** `/stops/:code` (auth) → `app/src/pages/StopBoard.tsx`
- **RouteDetail** `/lines/:code` (auth) → `app/src/pages/RouteDetail.tsx`
- **TripPlanner** `/plan` (auth) → `app/src/pages/TripPlanner.tsx`
- **Alerts** `/alerts` (auth) → `app/src/pages/Alerts.tsx`
- **SavedStops** `/saved` (auth) → `app/src/pages/SavedStops.tsx`
- **Settings** `/settings` (auth) → `app/src/pages/Settings.tsx`
- **PlanUpdated** `/plan-updated` (auth) → `app/src/pages/PlanUpdated.tsx`
- **About** `/about` → `app/src/pages/About.tsx`
- **Privacy** `/privacy` → `app/src/pages/Privacy.tsx`
- **Terms** `/terms` → `app/src/pages/Terms.tsx`

## Integrations (8 @molecule/* packages)

- **Database**: `@molecule/api-database-postgresql`
- **Domain resources**: `@molecule/api-resource-user`, `@molecule/api-resource-payment`
- **Email**: `@molecule/api-email-templates`, `@molecule/api-emails-mailgun`
- **Payments & billing**: `@molecule/api-payments-stripe`, `@molecule/api-entitlements`, `@molecule/app-billing-react`

## Required secrets

- DATABASE_URL — PostgreSQL connection string
- STRIPE_SECRET_KEY — Stripe secret API key (sk_test_... in test mode)
- STRIPE_WEBHOOK_SECRET — Stripe webhook signing secret (whsec_...)
