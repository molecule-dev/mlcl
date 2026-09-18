# Travel Booking

- **slug**: `travel-booking`
- **cluster**: real-estate-travel
- **type**: full-stack
- **layout**: landing

Booking.com-like travel platform with search, compare, book, and itinerary management

> **This is a complete, working app, already built.** The data model, handlers, and screens below all exist on disk (paths shown). Treat this as the user's existing codebase: **adapt the listed files in place** for the request; do not recreate tables, handlers, or pages that already exist, and do not add packages for functionality already implemented here.

## Features

`auth`, `search`, `maps`, `bookmarks`, `reviews`, `payments`

## Data model (13 domain tables)

_Already created by the existing SQL in `api/migrations/` — do NOT add new migrations for these tables._

- **bookings** — id, userId, resourceType, resourceId, status, startTime, endTime, duration, notes, metadata, createdAt, updatedAt
- **bookmarks** — id, userId, resourceType, resourceId, folder, createdAt, updatedAt
- **destinations** — id, slug, name, country, region, blurb, hero_image_url, latitude, longitude, popularity_score, featured, created_at, …
- **devices** — id, createdAt, updatedAt, userId, name, pushPlatform, pushSubscription, hasPushSubscription
- **itinerary_items** — id, user_id, trip_id, kind, title, detail, start_at, end_at, cost_cents, currency, vendor, created_at, …
- **notifications** — id, user_id, type, title, body, href, read, created_at
- **payments** — id, createdAt, updatedAt, userId, transactionId, productId, platformKey, data, receipt
- **properties** — id, destination_id, slug, name, kind, city, country, address, latitude, longitude, description, rating, …
- **review_helpful** — reviewId, userId, createdAt
- **reviews** — id, resourceType, resourceId, userId, rating, title, body, helpful, createdAt, updatedAt
- **room_inventory** — id, room_type_id, date, available_count
- **room_types** — id, property_id, name, description, capacity, price_per_night_cents, thumbnail_url, total_rooms, status, created_at, updated_at
- **travel_bookings** — id, user_id, property_id, room_type_id, check_in, check_out, guests, nights, subtotal_cents, taxes_cents, total_cents, currency, …

## API surface (handlers)

_These endpoints already exist — open and extend the named file, never recreate it._

- **\_seed** — `api/src/handlers/_seed.ts`
- **accommodations** — `api/src/handlers/accommodations.ts`
- **bookings** — `api/src/handlers/bookings.ts`
- **destinations** — `api/src/handlers/destinations.ts`
- **favorites** — `api/src/handlers/favorites.ts`
- **itineraries** — `api/src/handlers/itineraries.ts`
- **notifications** — `api/src/handlers/notifications.ts`
- **profile** — `api/src/handlers/profile.ts`
- **reviews** — `api/src/handlers/reviews.ts`
- **trips** — `api/src/handlers/trips.ts`

## Screens (13)

_These pages already exist — edit the named file in place, never create a parallel one._

- **Landing** `/` → `app/src/pages/Landing.tsx`
- **Login** `/login` → `app/src/pages/Login.tsx`
- **Signup** `/signup` → `app/src/pages/Signup.tsx`
- **ForgotPassword** `/forgot-password` → `app/src/pages/ForgotPassword.tsx`
- **ResetPassword** `/reset-password` → `app/src/pages/ResetPassword.tsx`
- **Search** `/search` (auth) → `app/src/pages/Search.tsx`
- **PropertyDetail** `/property/:id` (auth) → `app/src/pages/PropertyDetail.tsx`
- **Booking** `/booking/:id` (auth) → `app/src/pages/Booking.tsx`
- **Trips** `/trips` (auth) → `app/src/pages/Trips.tsx`
- **Favorites** `/favorites` (auth) → `app/src/pages/Favorites.tsx`
- **Account** `/account` (auth) → `app/src/pages/Account.tsx`
- **TripDetail** `/trips/:id` (auth) → `app/src/pages/TripDetail.tsx`
- **Notifications** `/notifications` (auth) → `app/src/pages/Notifications.tsx`

## Subscription tiers

free / pro / team — gated by: maxAccommodations, maxBookings, maxDestinations, maxItineraries, advancedFeatures, canExport, retentionDays

## Integrations (17 @molecule/* packages)

- **Database**: `@molecule/api-database-postgresql`
- **Domain resources**: `@molecule/api-resource-user`, `@molecule/api-resource-booking`, `@molecule/api-resource-review`, `@molecule/api-resource-bookmark`
- **Email**: `@molecule/api-emails-mailgun`
- **Frontend / UI**: `@molecule/app-maps`, `@molecule/app-gallery`, `@molecule/app-calendar`, `@molecule/app-date-range-picker`, `@molecule/app-virtual-scroll`
- **Other API**: `@molecule/api-geolocation-mapbox`, `@molecule/api-cache-redis`
- **Payments & billing**: `@molecule/api-payments-stripe`
- **Search**: `@molecule/api-search-meilisearch`
- **Uploads & media**: `@molecule/api-image-sharp`, `@molecule/api-uploads-s3`

## Required secrets

- DATABASE_URL — PostgreSQL connection string
- MAPBOX_ACCESS_TOKEN — Mapbox API access token
- STRIPE_SECRET_KEY — Stripe API secret key
- MEILISEARCH_API_KEY — Meilisearch API key
- S3_BUCKET — S3 bucket for images
- MAILGUN_API_KEY — Mailgun API key
