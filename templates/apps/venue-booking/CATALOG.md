# Venue Booking

- **slug**: `venue-booking`
- **cluster**: real-estate-travel
- **type**: full-stack
- **layout**: landing

Splacer-like venue booking with spaces, availability, pricing, and reviews

> **This is a complete, working app, already built.** The data model, handlers, and screens below all exist on disk (paths shown). Treat this as the user's existing codebase: **adapt the listed files in place** for the request; do not recreate tables, handlers, or pages that already exist, and do not add packages for functionality already implemented here.

## Features

`auth`, `search`, `maps`, `reviews`, `payments`

## Data model (11 domain tables)

_Already created by the existing SQL in `api/migrations/` — do NOT add new migrations for these tables._

- **availabilities** — id, venue_id, kind, day_of_week, start_time, end_time, blackout_start, blackout_end, created_at
- **bookings** — id, userId, resourceType, resourceId, status, startTime, endTime, duration, notes, metadata, createdAt, updatedAt
- **devices** — id, createdAt, updatedAt, userId, name, pushPlatform, pushSubscription, hasPushSubscription
- **favorites** — id, user_id, venue_id, created_at
- **message_threads** — id, booking_id, venue_id, participants, last_message_at, created_at
- **messages** — id, thread_id, sender_user_id, body, attachments, read_by, created_at
- **notifications** — id, user_id, kind, payload, read_at, created_at
- **payments** — id, createdAt, updatedAt, userId, transactionId, productId, platformKey, data, receipt
- **review_helpful** — reviewId, userId, createdAt
- **reviews** — id, resourceType, resourceId, userId, rating, title, body, helpful, createdAt, updatedAt
- **venues** — id, host_user_id, owner_id, title, description, category, venue_type, address, city, region, country, postal_code, …

## API surface (handlers)

_These endpoints already exist — open and extend the named file, never recreate it._

- **\_decorate** — `api/src/handlers/_decorate.ts`
- **\_seed** — `api/src/handlers/_seed.ts`
- **bookings** — `api/src/handlers/bookings.ts`
- **favorites** — `api/src/handlers/favorites.ts`
- **host_metrics** — `api/src/handlers/host_metrics.ts`
- **messages** — `api/src/handlers/messages.ts`
- **notifications** — `api/src/handlers/notifications.ts`
- **profile** — `api/src/handlers/profile.ts`
- **reservations** — `api/src/handlers/reservations.ts`
- **reviews** — `api/src/handlers/reviews.ts`
- **venues** — `api/src/handlers/venues.ts`

## Screens (18)

_These pages already exist — edit the named file in place, never create a parallel one._

- **Landing** `/` → `app/src/pages/Landing.tsx`
- **Login** `/login` → `app/src/pages/Login.tsx`
- **Signup** `/signup` → `app/src/pages/Signup.tsx`
- **ForgotPassword** `/forgot-password` → `app/src/pages/ForgotPassword.tsx`
- **ResetPassword** `/reset-password` → `app/src/pages/ResetPassword.tsx`
- **Search** `/search` (auth) → `app/src/pages/Search.tsx`
- **VenueDetail** `/venue/:id` (auth) → `app/src/pages/VenueDetail.tsx`
- **Booking** `/book/:venueId` (auth) → `app/src/pages/Booking.tsx`
- **Reservations** `/reservations` (auth) → `app/src/pages/Reservations.tsx`
- **Favorites** `/favorites` (auth) → `app/src/pages/Favorites.tsx`
- **Account** `/account` (auth) → `app/src/pages/Account.tsx`
- **ReservationDetail** `/reservations/:id` (auth) → `app/src/pages/ReservationDetail.tsx`
- **BookingConfirmation** `/booking/confirmation/:id` (auth) → `app/src/pages/BookingConfirmation.tsx`
- **Messages** `/messages` (auth) → `app/src/pages/Messages.tsx`
- **MessageThread** `/messages/:id` (auth) → `app/src/pages/MessageThread.tsx`
- **HostDashboard** `/host` (auth) → `app/src/pages/HostDashboard.tsx`
- **Notifications** `/notifications` (auth) → `app/src/pages/Notifications.tsx`
- **Settings** `/settings` (auth) → `app/src/pages/Settings.tsx`

## Subscription tiers

free / pro / team — gated by: maxBookings, maxReviews, maxVenues, advancedFeatures, canExport, retentionDays

## Integrations (15 @molecule/* packages)

- **Database**: `@molecule/api-database-postgresql`
- **Domain resources**: `@molecule/api-resource-user`, `@molecule/api-resource-booking`, `@molecule/api-resource-review`
- **Email**: `@molecule/api-emails-mailgun`
- **Frontend / UI**: `@molecule/app-maps`, `@molecule/app-gallery`, `@molecule/app-calendar`, `@molecule/app-date-range-picker`, `@molecule/app-virtual-scroll`
- **Other API**: `@molecule/api-geolocation-mapbox`
- **Payments & billing**: `@molecule/api-payments-stripe`
- **Search**: `@molecule/api-search-meilisearch`
- **Uploads & media**: `@molecule/api-image-sharp`, `@molecule/api-uploads-s3`

## Required secrets

- DATABASE_URL — PostgreSQL connection string
- MAPBOX_ACCESS_TOKEN — Mapbox API access token
- STRIPE_SECRET_KEY — Stripe API secret key
- MEILISEARCH_API_KEY — Meilisearch API key
- S3_BUCKET — S3 bucket for venue photos
- MAILGUN_API_KEY — Mailgun API key
