# Tutoring Marketplace

- **slug**: `tutoring-marketplace`
- **cluster**: education
- **type**: full-stack
- **layout**: landing

Wyzant-like tutoring marketplace with tutor profiles, booking, sessions, and reviews — with built-in Stripe-backed subscription tiers

> **This is a complete, working app, already built.** The data model, handlers, and screens below all exist on disk (paths shown). Treat this as the user's existing codebase: **adapt the listed files in place** for the request; do not recreate tables, handlers, or pages that already exist, and do not add packages for functionality already implemented here.

## Features

`auth`, `search`, `payments`, `booking`, `realtime`, `calendar`, `subscriptions`

## Data model (14 domain tables)

_Already created by the existing SQL in `api/migrations/` — do NOT add new migrations for these tables._

- **availability_slots** — id, tutor_id, user_id, day_of_week, start_time, end_time, recurring, created_at
- **bookings** — id, student_id, tutor_id, subject, scheduled_at, duration_hours, total_amount, currency, payment_intent_id, status, cancelled_at, cancel_reason, …
- **devices** — id, createdAt, updatedAt, userId, name, pushPlatform, pushSubscription, hasPushSubscription
- **message_threads** — id, user_a_id, user_b_id, last_message_at, created_at
- **messages** — id, thread_id, sender_id, body, read_at, created_at
- **payments** — id, createdAt, updatedAt, userId, transactionId, productId, platformKey, data, receipt
- **resource_tags** — id, tagId, resourceType, resourceId, createdAt
- **review_helpful** — reviewid, userid, createdat
- **reviews** — id, reviewer_id, tutor_id, booking_id, rating, body, created_at, updated_at
- **session_messages** — id, session_id, user_id, content, created_at
- **subjects** — id, name, slug, parent_slug, sort_order, created_at
- **tags** — id, name, slug, color, description, createdAt, updatedAt
- **tutor_profiles** — id, user_id, display_name, headline, bio, hourly_rate, subject, subjects, languages, rating_average, rating_count, session_count, …
- **tutoring_sessions** — id, booking_id, tutor_id, student_id, status, room_id, transcript_url, recording_url, notes, started_at, ended_at, created_at, …

## API surface (handlers)

_These endpoints already exist — open and extend the named file, never recreate it._

- **bookings** — `api/src/handlers/bookings.ts`
- **messages** — `api/src/handlers/messages.ts`
- **reviews** — `api/src/handlers/reviews.ts`
- **sessions** — `api/src/handlers/sessions.ts`
- **subjects** — `api/src/handlers/subjects.ts`
- **tutors** — `api/src/handlers/tutors.ts`

## Screens (15)

_These pages already exist — edit the named file in place, never create a parallel one._

- **Landing** `/` → `app/src/pages/Landing.tsx`
- **Login** `/login` → `app/src/pages/Login.tsx`
- **Signup** `/signup` → `app/src/pages/Signup.tsx`
- **ForgotPassword** `/forgot-password` → `app/src/pages/ForgotPassword.tsx`
- **ResetPassword** `/reset-password` → `app/src/pages/ResetPassword.tsx`
- **Search** `/search` (auth) → `app/src/pages/Search.tsx`
- **TutorProfile** `/tutor/:id` (auth) → `app/src/pages/TutorProfile.tsx`
- **Booking** `/book/:tutorId` (auth) → `app/src/pages/Booking.tsx`
- **Sessions** `/sessions` (auth) → `app/src/pages/Sessions.tsx`
- **Messages** `/messages` (auth) → `app/src/pages/Messages.tsx`
- **Account** `/account` (auth) → `app/src/pages/Account.tsx`
- **SessionDetail** `/sessions/:id` (auth) → `app/src/pages/SessionDetail.tsx`
- **BookingConfirmation** `/book/:tutorId/confirm` (auth) → `app/src/pages/BookingConfirmation.tsx`
- **BecomeTutor** `/become-tutor` (auth) → `app/src/pages/BecomeTutor.tsx`
- **TutorDashboard** `/dashboard` (auth) → `app/src/pages/TutorDashboard.tsx`

## Subscription tiers

free / pro / team — gated by: maxBookings, maxReviews, maxSessions, maxSubjects, maxTutors, advancedFeatures, canExport, retentionDays

## Integrations (21 @molecule/* packages)

- **Database**: `@molecule/api-database-postgresql`
- **Domain resources**: `@molecule/api-resource-user`, `@molecule/api-resource-review`, `@molecule/api-resource-booking`, `@molecule/api-resource-tag`, `@molecule/api-resource-payment`
- **Email**: `@molecule/api-emails-mailgun`, `@molecule/api-email-templates`
- **Frontend / UI**: `@molecule/app-data-table`, `@molecule/app-calendar`, `@molecule/app-virtual-scroll`, `@molecule/app-command-palette`
- **Other API**: `@molecule/api-cron-node-cron`
- **Payments & billing**: `@molecule/api-payments-stripe`, `@molecule/api-entitlements`, `@molecule/app-billing-react`
- **Realtime**: `@molecule/api-realtime-socketio`, `@molecule/app-realtime-socketio`
- **Search**: `@molecule/api-search-meilisearch`
- **Uploads & media**: `@molecule/api-image-sharp`, `@molecule/api-uploads-s3`

## Required secrets

- DATABASE_URL — PostgreSQL connection string
- STRIPE_SECRET_KEY — Stripe secret key
- STRIPE_PUBLISHABLE_KEY — Stripe publishable key
- MAILGUN_API_KEY — Mailgun API key
- S3_BUCKET — S3 bucket for profile images
- STRIPE_WEBHOOK_SECRET — Stripe webhook signing secret (whsec_...)
