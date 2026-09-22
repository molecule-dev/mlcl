# Flight Search

- **slug**: `flight-search`
- **cluster**: real-estate-travel
- **type**: full-stack
- **layout**: landing

Kayak-like flight search with routes, price comparison, alerts, and multi-city trips

> **This is a complete, working app, already built.** The data model, handlers, and screens below all exist on disk (paths shown). Treat this as the user's existing codebase: **adapt the listed files in place** for the request; do not recreate tables, handlers, or pages that already exist, and do not add packages for functionality already implemented here.

## Features

`auth`, `search`, `bookmarks`, `notifications`

## Data model (11 domain tables)

_Already created by the existing SQL in `api/migrations/` — do NOT add new migrations for these tables._

- **airports** — iata_code, icao_code, name, city, country, latitude, longitude, timezone, major, popular, traffic_rank, created_at
- **flights** — id, airline, airline_code, flight_number, origin_iata, origin_city, destination_iata, destination_city, depart_date, depart_at, arrive_at, duration_minutes, …
- **bookings** — id, user_id, trip_id, confirmation_code, status, flight_id, passenger_count, total_cents, currency, card_last4, stripe_payment_intent_id, created_at, …
- **bookmarks** — id, userId, resourceType, resourceId, folder, createdAt, updatedAt
- **devices** — id, createdAt, updatedAt, userId, name, pushPlatform, pushSubscription, hasPushSubscription
- **flight_search_logs** — id, user_id, origin, destination, depart_date, return_date, passengers, cabin, searched_at
- **notifications** — id, user_id, type, title, body, icon, read, created_at
- **price_alert_history** — id, alert_id, user_id, observed_at, lowest_price_cents
- **price_alerts** — id, user_id, origin_iata, origin_city, destination_iata, destination_city, target_price_cents, current_lowest_cents, departure_date, return_date, cabin, history, …
- **trips** — id, user_id, kind, confirmation_code, status, flight_payload, passenger_count, cabin, total_cents, currency, booked_at, created_at, …
- **payments** — id, createdAt, updatedAt, userId, transactionId, productId, platformKey, data, receipt

## API surface (handlers)

_These endpoints already exist — open and extend the named file, never recreate it._

- **airports** — `api/src/handlers/airports.ts`
- **alerts** — `api/src/handlers/alerts.ts`
- **bookings** — `api/src/handlers/bookings.ts`
- **flights** — `api/src/handlers/flights.ts`
- **notifications** — `api/src/handlers/notifications.ts`
- **preferences** — `api/src/handlers/preferences.ts`
- **trips** — `api/src/handlers/trips.ts`

## Screens (12)

_These pages already exist — edit the named file in place, never create a parallel one._

- **Landing** `/` → `app/src/pages/Landing.tsx`
- **Login** `/login` → `app/src/pages/Login.tsx`
- **Signup** `/signup` → `app/src/pages/Signup.tsx`
- **ForgotPassword** `/forgot-password` → `app/src/pages/ForgotPassword.tsx`
- **ResetPassword** `/reset-password` → `app/src/pages/ResetPassword.tsx`
- **Results** `/search` (auth) → `app/src/pages/Results.tsx`
- **FlightDetail** `/flight/:id` (auth) → `app/src/pages/FlightDetail.tsx`
- **Booking** `/book/:id` (auth) → `app/src/pages/Booking.tsx`
- **Trips** `/trips` (auth) → `app/src/pages/Trips.tsx`
- **PriceAlerts** `/alerts` (auth) → `app/src/pages/PriceAlerts.tsx`
- **Settings** `/settings` (auth) → `app/src/pages/Settings.tsx`
- **TripDetail** `/trips/:id` (auth) → `app/src/pages/TripDetail.tsx`

## Subscription tiers

free / pro / team — gated by: maxAirports, maxAlerts, maxFlights, advancedFeatures, canExport, retentionDays

## Integrations (12 @molecule/* packages)

- **Database**: `@molecule/api-database-postgresql`
- **Domain resources**: `@molecule/api-resource-user`, `@molecule/api-resource-bookmark`
- **Email**: `@molecule/api-emails-mailgun`
- **Frontend / UI**: `@molecule/app-data-table`, `@molecule/app-date-range-picker`, `@molecule/app-virtual-scroll`, `@molecule/app-command-palette`
- **Other API**: `@molecule/api-cache-redis`, `@molecule/api-cron-node-cron`, `@molecule/api-http-axios`
- **Search**: `@molecule/api-search-meilisearch`

## Required secrets

- DATABASE_URL — PostgreSQL connection string
- MEILISEARCH_API_KEY — Meilisearch API key
- MAILGUN_API_KEY — Mailgun API key for price alerts
