# Event Ticketing

- **slug**: `event-ticketing`
- **cluster**: real-estate-travel
- **type**: full-stack
- **layout**: landing

Eventbrite-like event platform with creation, ticketing, check-in, and analytics

> **This is a complete, working app, already built.** The data model, handlers, and screens below all exist on disk (paths shown). Treat this as the user's existing codebase: **adapt the listed files in place** for the request; do not recreate tables, handlers, or pages that already exist, and do not add packages for functionality already implemented here.

## Features

`auth`, `search`, `payments`, `maps`, `analytics`

## Data model (11 domain tables)

_Already created by the existing SQL in `api/migrations/` — do NOT add new migrations for these tables._

- **bookings** — id, userId, resourceType, resourceId, status, startTime, endTime, duration, notes, metadata, createdAt, updatedAt
- **devices** — id, createdAt, updatedAt, userId, name, pushPlatform, pushSubscription, hasPushSubscription
- **events** — id, user_id, organizer_user_id, title, category, description, venue, venue_address, city, latitude, longitude, start_date, …
- **order_refunds** — id, user_id, order_id, requested_by, reason, status, processed_at, stripe_refund_id, created_at, updated_at
- **orders** — id, user_id, event_id, tier_id, quantity, subtotal_cents, fees_cents, total_cents, currency, stripe_payment_intent_id, status, confirmation_code, …
- **payments** — id, createdAt, updatedAt, userId, transactionId, productId, platformKey, data, receipt
- **resource_tags** — id, tagId, resourceType, resourceId, createdAt
- **tags** — id, name, slug, color, description, createdAt, updatedAt
- **ticket_tiers** — id, user_id, event_id, name, description, price_cents, quantity_total, quantity_sold, created_at, updated_at
- **ticket_transfers** — id, user_id, ticket_id, from_user_id, to_user_id, to_email, accepted_at, created_at
- **tickets** — id, user_id, order_id, event_id, tier_id, seat, ref_code, qr_payload, status, transferable, created_at, updated_at

## API surface (handlers)

_These endpoints already exist — open and extend the named file, never recreate it._

- **attendees** — `api/src/handlers/attendees.ts`
- **checkin** — `api/src/handlers/checkin.ts`
- **dashboard** — `api/src/handlers/dashboard.ts`
- **events** — `api/src/handlers/events.ts`
- **my-tickets** — `api/src/handlers/my-tickets.ts`
- **notifications** — `api/src/handlers/notifications.ts`
- **orders** — `api/src/handlers/orders.ts`
- **profile** — `api/src/handlers/profile.ts`
- **refunds** — `api/src/handlers/refunds.ts`
- **tickets** — `api/src/handlers/tickets.ts`
- **transfers** — `api/src/handlers/transfers.ts`

## Screens (16)

_These pages already exist — edit the named file in place, never create a parallel one._

- **Landing** `/` → `app/src/pages/Landing.tsx`
- **Login** `/login` → `app/src/pages/Login.tsx`
- **Signup** `/signup` → `app/src/pages/Signup.tsx`
- **ForgotPassword** `/forgot-password` → `app/src/pages/ForgotPassword.tsx`
- **ResetPassword** `/reset-password` → `app/src/pages/ResetPassword.tsx`
- **Dashboard** `/dashboard` (auth) → `app/src/pages/Dashboard.tsx`
- **EventList** `/events` → `app/src/pages/EventList.tsx`
- **EventDetail** `/events/:id` → `app/src/pages/EventDetail.tsx`
- **Attendees** `/events/:id/attendees` (auth) → `app/src/pages/Attendees.tsx`
- **Settings** `/settings` (auth) → `app/src/pages/Settings.tsx`
- **CreateEvent** `/events/new` (auth) → `app/src/pages/CreateEvent.tsx`
- **EditEvent** `/events/:id/edit` (auth) → `app/src/pages/EditEvent.tsx`
- **MyTickets** `/my-tickets` (auth) → `app/src/pages/MyTickets.tsx`
- **OrderConfirmation** `/orders/:id/confirmation` (auth) → `app/src/pages/OrderConfirmation.tsx`
- **TicketDetail** `/tickets/:id` (auth) → `app/src/pages/TicketDetail.tsx`
- **Notifications** `/notifications` (auth) → `app/src/pages/Notifications.tsx`

## Subscription tiers

free / pro / team — gated by: maxCheckin, maxEvents, maxOrders, maxTickets, advancedFeatures, canExport, retentionDays

## Integrations (17 @molecule/* packages)

- **Database**: `@molecule/api-database-postgresql`
- **Domain resources**: `@molecule/api-resource-user`, `@molecule/api-resource-booking`, `@molecule/api-resource-tag`
- **Email**: `@molecule/api-emails-mailgun`
- **Frontend / UI**: `@molecule/app-maps`, `@molecule/app-data-table`, `@molecule/app-calendar`, `@molecule/app-date-range-picker`, `@molecule/app-virtual-scroll`, `@molecule/app-gallery`
- **Other API**: `@molecule/api-geolocation-mapbox`, `@molecule/api-reporting-database`
- **Payments & billing**: `@molecule/api-payments-stripe`
- **Search**: `@molecule/api-search-meilisearch`
- **Uploads & media**: `@molecule/api-image-sharp`, `@molecule/api-uploads-s3`

## Required secrets

- DATABASE_URL — PostgreSQL connection string
- STRIPE_SECRET_KEY — Stripe API secret key
- MAPBOX_ACCESS_TOKEN — Mapbox API access token
- MEILISEARCH_API_KEY — Meilisearch API key
- S3_BUCKET — S3 bucket for event images
- MAILGUN_API_KEY — Mailgun API key
