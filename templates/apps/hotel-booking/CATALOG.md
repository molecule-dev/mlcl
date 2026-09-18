# Hotel Booking

- **slug**: `hotel-booking`
- **cluster**: real-estate-travel
- **type**: full-stack
- **layout**: landing

Hotels.com-like hotel booking with rooms, availability, rates, amenities, and loyalty rewards

> **This is a complete, working app, already built.** The data model, handlers, and screens below all exist on disk (paths shown). Treat this as the user's existing codebase: **adapt the listed files in place** for the request; do not recreate tables, handlers, or pages that already exist, and do not add packages for functionality already implemented here.

## Features

`auth`, `search`, `maps`, `bookmarks`, `reviews`, `payments`

## Data model (12 domain tables)

_Already created by the existing SQL in `api/migrations/` — do NOT add new migrations for these tables._

- **bookings** — id, userId, resourceType, resourceId, status, startTime, endTime, duration, notes, metadata, createdAt, updatedAt
- **bookmarks** — id, userId, resourceType, resourceId, folder, createdAt, updatedAt
- **devices** — id, createdAt, updatedAt, userId, name, pushPlatform, pushSubscription, hasPushSubscription
- **hotels** — id, name, slug, city, country, address, latitude, longitude, description, rating, review_count, stars, …
- **loyalty** — id, user_id, tier, points, nights_count, year_to_date_spend_cents, year, created_at, updated_at
- **notifications** — id, user_id, type, title, body, href, read, created_at
- **payments** — id, createdAt, updatedAt, userId, transactionId, productId, platformKey, data, receipt
- **reservations** — id, user_id, hotel_id, room_id, check_in, check_out, guests, nights, subtotal, taxes, resort_fee, total, …
- **review_helpful** — reviewId, userId, createdAt
- **reviews** — id, resourceType, resourceId, userId, rating, title, body, helpful, createdAt, updatedAt
- **room_inventory** — id, room_id, date, available_count
- **rooms** — id, hotel_id, name, description, capacity, rate, resort_fee, thumbnail_url, total_rooms, status, created_at, updated_at

## API surface (handlers)

_These endpoints already exist — open and extend the named file, never recreate it._

- **\_decorate** — `api/src/handlers/_decorate.ts`
- **\_seed** — `api/src/handlers/_seed.ts`
- **favorites** — `api/src/handlers/favorites.ts`
- **hotels** — `api/src/handlers/hotels.ts`
- **loyalty** — `api/src/handlers/loyalty.ts`
- **notifications** — `api/src/handlers/notifications.ts`
- **profile** — `api/src/handlers/profile.ts`
- **properties** — `api/src/handlers/properties.ts`
- **reservations** — `api/src/handlers/reservations.ts`
- **reviews** — `api/src/handlers/reviews.ts`
- **rooms** — `api/src/handlers/rooms.ts`
- **trips** — `api/src/handlers/trips.ts`

## Screens (14)

_These pages already exist — edit the named file in place, never create a parallel one._

- **Landing** `/` → `app/src/pages/Landing.tsx`
- **Login** `/login` → `app/src/pages/Login.tsx`
- **Signup** `/signup` → `app/src/pages/Signup.tsx`
- **ForgotPassword** `/forgot-password` → `app/src/pages/ForgotPassword.tsx`
- **ResetPassword** `/reset-password` → `app/src/pages/ResetPassword.tsx`
- **SearchResults** `/search` → `app/src/pages/SearchResults.tsx`
- **PropertyDetail** `/property/:id` → `app/src/pages/PropertyDetail.tsx`
- **BookingCheckout** `/booking/:id` (auth) → `app/src/pages/BookingCheckout.tsx`
- **Trips** `/trips` (auth) → `app/src/pages/Trips.tsx`
- **Favorites** `/favorites` (auth) → `app/src/pages/Favorites.tsx`
- **Account** `/account` (auth) → `app/src/pages/Account.tsx`
- **BookingConfirmation** `/booking/:id/confirmation` (auth) → `app/src/pages/BookingConfirmation.tsx`
- **TripDetail** `/trips/:id` (auth) → `app/src/pages/TripDetail.tsx`
- **Notifications** `/notifications` (auth) → `app/src/pages/Notifications.tsx`

## Subscription tiers

free / pro / team — gated by: maxHotels, maxReservations, maxReviews, maxRooms, advancedFeatures, canExport, retentionDays

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
- S3_BUCKET — S3 bucket for hotel photos
- MAILGUN_API_KEY — Mailgun API key
