# Rental Marketplace

- **slug**: `rental-marketplace`
- **cluster**: real-estate-travel
- **type**: full-stack
- **layout**: landing

Airbnb-like rental marketplace with listings, booking, reviews, and messaging

> **This is a complete, working app, already built.** The data model, handlers, and screens below all exist on disk (paths shown). Treat this as the user's existing codebase: **adapt the listed files in place** for the request; do not recreate tables, handlers, or pages that already exist, and do not add packages for functionality already implemented here.

## Features

`auth`, `search`, `maps`, `bookmarks`, `reviews`, `payments`, `messaging`

## Data model (14 domain tables)

_Already created by the existing SQL in `api/migrations/` — do NOT add new migrations for these tables._

- **availability** — id, listing_id, date, available, price_override, created_at, updated_at
- **bookings** — id, userId, resourceType, resourceId, status, startTime, endTime, duration, notes, metadata, createdAt, updatedAt
- **bookmarks** — id, userId, resourceType, resourceId, folder, createdAt, updatedAt
- **comments** — id, resourceType, resourceId, userId, parentId, body, editedAt, createdAt, updatedAt
- **devices** — id, createdAt, updatedAt, userId, name, pushPlatform, pushSubscription, hasPushSubscription
- **host_payouts** — id, host_id, user_id, booking_id, amount, service_fee, currency, status, stripe_transfer_id, payout_reference, paid_at, created_at, …
- **listings** — id, host_id, user_id, title, description, address, city, state, country, postal_code, latitude, longitude, …
- **message_threads** — id, participant_a_id, participant_b_id, participant_id, user_id, listing_id, last_message_at, last_message_preview, unread_count_a, unread_count_b, created_at, updated_at, …
- **messages** — id, thread_id, sender_id, user_id, body, read_at, created_at
- **notifications** — id, user_id, type, payload, read_at, created_at
- **payments** — id, createdAt, updatedAt, userId, transactionId, productId, platformKey, data, receipt
- **review_helpful** — reviewId, userId, createdAt
- **reviews** — id, resourceType, resourceId, userId, rating, title, body, helpful, createdAt, updatedAt
- **uploads** — id, user_id, file_id, filename, mimetype, size, created_at

## API surface (handlers)

_These endpoints already exist — open and extend the named file, never recreate it._

- **\_aliases** — `api/src/handlers/_aliases.ts`
- **\_decorate** — `api/src/handlers/_decorate.ts`
- **\_seed** — `api/src/handlers/_seed.ts`
- **bookings** — `api/src/handlers/bookings.ts`
- **bookmarks** — `api/src/handlers/bookmarks.ts`
- **hosts** — `api/src/handlers/hosts.ts`
- **listings** — `api/src/handlers/listings.ts`
- **messages** — `api/src/handlers/messages.ts`
- **notifications** — `api/src/handlers/notifications.ts`
- **payouts** — `api/src/handlers/payouts.ts`
- **reviews** — `api/src/handlers/reviews.ts`
- **uploads** — `api/src/handlers/uploads.ts`

## Screens (20)

_These pages already exist — edit the named file in place, never create a parallel one._

- **Landing** `/` → `app/src/pages/Landing.tsx`
- **Login** `/login` → `app/src/pages/Login.tsx`
- **Signup** `/signup` → `app/src/pages/Signup.tsx`
- **ForgotPassword** `/forgot-password` → `app/src/pages/ForgotPassword.tsx`
- **ResetPassword** `/reset-password` → `app/src/pages/ResetPassword.tsx`
- **Search** `/search` (auth) → `app/src/pages/Search.tsx`
- **ListingDetail** `/listings/:id` (auth) → `app/src/pages/ListingDetail.tsx`
- **Bookings** `/bookings` (auth) → `app/src/pages/Bookings.tsx`
- **Wishlist** `/wishlist` (auth) → `app/src/pages/Wishlist.tsx`
- **HostDashboard** `/host` (auth) → `app/src/pages/HostDashboard.tsx`
- **Messages** `/messages` (auth) → `app/src/pages/Messages.tsx`
- **Settings** `/settings` (auth) → `app/src/pages/Settings.tsx`
- **BookingDetail** `/bookings/:id` (auth) → `app/src/pages/BookingDetail.tsx`
- **MessageThread** `/messages/:id` (auth) → `app/src/pages/MessageThread.tsx`
- **HostListings** `/host/listings` (auth) → `app/src/pages/HostListings.tsx`
- **HostListingDetail** `/host/listings/:id` (auth) → `app/src/pages/HostListingDetail.tsx`
- **Reservations** `/host/reservations` (auth) → `app/src/pages/Reservations.tsx`
- **CreateListing** `/host/listings/new` (auth) → `app/src/pages/CreateListing.tsx`
- **Profile** `/users/:id` (auth) → `app/src/pages/Profile.tsx`
- **Notifications** `/notifications` (auth) → `app/src/pages/Notifications.tsx`

## Subscription tiers

free / pro / team — gated by: maxBookings, maxHosts, maxListings, maxMessages, maxReviews, advancedFeatures, canExport, retentionDays

## Integrations (19 @molecule/* packages)

- **Database**: `@molecule/api-database-postgresql`
- **Domain resources**: `@molecule/api-resource-user`, `@molecule/api-resource-booking`, `@molecule/api-resource-review`, `@molecule/api-resource-bookmark`, `@molecule/api-resource-comment`
- **Email**: `@molecule/api-emails-mailgun`
- **Frontend / UI**: `@molecule/app-maps`, `@molecule/app-gallery`, `@molecule/app-calendar`, `@molecule/app-date-range-picker`, `@molecule/app-virtual-scroll`
- **Other API**: `@molecule/api-geolocation-mapbox`
- **Payments & billing**: `@molecule/api-payments-stripe`
- **Realtime**: `@molecule/api-realtime-socketio`, `@molecule/app-realtime-socketio`
- **Search**: `@molecule/api-search-meilisearch`
- **Uploads & media**: `@molecule/api-image-sharp`, `@molecule/api-uploads-s3`

## Required secrets

- DATABASE_URL — PostgreSQL connection string
- MAPBOX_ACCESS_TOKEN — Mapbox API access token
- STRIPE_SECRET_KEY — Stripe API secret key for payments
- MEILISEARCH_API_KEY — Meilisearch API key
- S3_BUCKET — S3 bucket for listing photos
- MAILGUN_API_KEY — Mailgun API key for notifications
