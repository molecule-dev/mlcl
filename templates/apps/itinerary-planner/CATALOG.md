# Itinerary Planner

- **slug**: `itinerary-planner`
- **cluster**: real-estate-travel
- **type**: full-stack
- **layout**: dashboard

TripIt-like trip planner with itineraries, activities, maps, collaboration, and sharing

> **This is a complete, working app, already built.** The data model, handlers, and screens below all exist on disk (paths shown). Treat this as the user's existing codebase: **adapt the listed files in place** for the request; do not recreate tables, handlers, or pages that already exist, and do not add packages for functionality already implemented here.

## Features

`auth`, `maps`, `collaboration`, `sharing`

## Data model (11 domain tables)

_Already created by the existing SQL in `api/migrations/` — do NOT add new migrations for these tables._

- **activities** — id, user_id, trip_id, day_index, position, sort_order, title, kind, date, start_time, starts_at, ends_at, …
- **bookmarks** — id, userId, resourceType, resourceId, folder, createdAt, updatedAt
- **destinations** — id, name, region, blurb, thumbnail, pill_label, trip_count, created_at
- **devices** — id, createdAt, updatedAt, userId, name, pushPlatform, pushSubscription, hasPushSubscription
- **expenses** — id, user_id, trip_id, category, amount_cents, currency, occurred_at, vendor, description, created_at, updated_at
- **notifications** — id, user_id, trip_id, kind, title, body, occurred_at, read, created_at
- **trip_bookings** — id, user_id, trip_id, kind, title, detail, start_at, end_at, confirmation_code, status, cost_cents, currency, …
- **trip_collaborators** — id, trip_id, user_id, invited_by, role, invited_at, accepted_at, created_at, updated_at
- **trip_invites** — id, trip_id, user_id, email, token, role, sent_at, accepted_user_id, created_at
- **trips** — id, user_id, name, destination, country, cover_url, start_date, end_date, status, budget_total_cents, budget_used_cents, share_token, …
- **payments** — id, createdAt, updatedAt, userId, transactionId, productId, platformKey, data, receipt

## API surface (handlers)

_These endpoints already exist — open and extend the named file, never recreate it._

- **\_authz** — `api/src/handlers/_authz.ts`
- **activities** — `api/src/handlers/activities.ts`
- **bookings** — `api/src/handlers/bookings.ts`
- **collaborators** — `api/src/handlers/collaborators.ts`
- **destinations** — `api/src/handlers/destinations.ts`
- **expenses** — `api/src/handlers/expenses.ts`
- **notifications** — `api/src/handlers/notifications.ts`
- **trips** — `api/src/handlers/trips.ts`

## Screens (15)

_These pages already exist — edit the named file in place, never create a parallel one._

- **Landing** `/` → `app/src/pages/Landing.tsx`
- **Login** `/login` → `app/src/pages/Login.tsx`
- **Signup** `/signup` → `app/src/pages/Signup.tsx`
- **ForgotPassword** `/forgot-password` → `app/src/pages/ForgotPassword.tsx`
- **ResetPassword** `/reset-password` → `app/src/pages/ResetPassword.tsx`
- **Dashboard** `/dashboard` (auth) → `app/src/pages/Dashboard.tsx`
- **Trips** `/trips` (auth) → `app/src/pages/Trips.tsx`
- **TripPlanner** `/trips/new` (auth) → `app/src/pages/TripPlanner.tsx`
- **TripDetail** `/trips/:id` (auth) → `app/src/pages/TripDetail.tsx`
- **Destinations** `/destinations` (auth) → `app/src/pages/Destinations.tsx`
- **Bookings** `/bookings` (auth) → `app/src/pages/Bookings.tsx`
- **Expenses** `/expenses` (auth) → `app/src/pages/Expenses.tsx`
- **Settings** `/settings` (auth) → `app/src/pages/Settings.tsx`
- **Notifications** `/notifications` (auth) → `app/src/pages/Notifications.tsx`
- **Calendar** `/calendar` (auth) → `app/src/pages/Calendar.tsx`

## Subscription tiers

free / pro / team — gated by: maxActivities, maxCollaborators, maxTrips, advancedFeatures, canExport, retentionDays

## Integrations (13 @molecule/* packages)

- **Auth & permissions**: `@molecule/api-permissions-custom`
- **Database**: `@molecule/api-database-postgresql`
- **Domain resources**: `@molecule/api-resource-user`, `@molecule/api-resource-bookmark`
- **Email**: `@molecule/api-emails-mailgun`
- **Frontend / UI**: `@molecule/app-maps`, `@molecule/app-calendar`, `@molecule/app-drag-drop`, `@molecule/app-gallery`
- **Other API**: `@molecule/api-geolocation-mapbox`
- **Realtime**: `@molecule/api-realtime-socketio`, `@molecule/app-realtime-socketio`
- **Uploads & media**: `@molecule/api-uploads-s3`

## Required secrets

- DATABASE_URL — PostgreSQL connection string
- MAPBOX_ACCESS_TOKEN — Mapbox API access token
- S3_BUCKET — S3 bucket for trip photos
- MAILGUN_API_KEY — Mailgun API key for sharing invites
