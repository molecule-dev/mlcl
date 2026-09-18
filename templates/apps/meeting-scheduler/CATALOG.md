# Meeting Scheduler

- **slug**: `meeting-scheduler`
- **cluster**: business-saas
- **type**: full-stack
- **layout**: dashboard

Calendly-like scheduling with availability, booking, and calendar sync

> **This is a complete, working app, already built.** The data model, handlers, and screens below all exist on disk (paths shown). Treat this as the user's existing codebase: **adapt the listed files in place** for the request; do not recreate tables, handlers, or pages that already exist, and do not add packages for functionality already implemented here.

## Features

`auth`, `availability`, `booking`, `calendar`, `email-notifications`

## Data model (7 domain tables)

_Already created by the existing SQL in `api/migrations/` — do NOT add new migrations for these tables._

- **availability_overrides** — id, user_id, date, is_unavailable, start_minute, end_minute, created_at, updatedAt
- **availability_rules** — id, user_id, day_of_week, start_minute, end_minute, timezone, created_at, updatedAt
- **bookings** — id, event_type_id, host_user_id, invitee_name, invitee_email, invitee_timezone, start_at, end_at, status, location_kind, location_value, answers, …
- **devices** — id, createdAt, updatedAt, userId, name, pushPlatform, pushSubscription, hasPushSubscription
- **event_types** — id, owner_id, name, slug, description, duration_minutes, location_kind, location_value, buffer_before_minutes, buffer_after_minutes, min_notice_minutes, max_per_day, …
- **external_calendars** — id, user_id, provider, access_token, refresh_token, calendar_id, sync_enabled, last_sync_at, created_at, updatedAt
- **payments** — id, createdAt, updatedAt, userId, transactionId, productId, platformKey, data, receipt

## API surface (handlers)

_These endpoints already exist — open and extend the named file, never recreate it._

- **availability** — `api/src/handlers/availability.ts`
- **bookings** — `api/src/handlers/bookings.ts`
- **event-types** — `api/src/handlers/event-types.ts`
- **profile** — `api/src/handlers/profile.ts`

## Screens (18)

_These pages already exist — edit the named file in place, never create a parallel one._

- **Landing** `/` → `app/src/pages/Landing.tsx`
- **Login** `/login` → `app/src/pages/Login.tsx`
- **Signup** `/signup` → `app/src/pages/Signup.tsx`
- **ForgotPassword** `/forgot-password` → `app/src/pages/ForgotPassword.tsx`
- **ResetPassword** `/reset-password` → `app/src/pages/ResetPassword.tsx`
- **Dashboard** `/dashboard` (auth) → `app/src/pages/Dashboard.tsx`
- **Calendar** `/calendar` (auth) → `app/src/pages/Calendar.tsx`
- **EventTypes** `/event-types` (auth) → `app/src/pages/EventTypes.tsx`
- **EventTypeEditor** `/event-types/:id` (auth) → `app/src/pages/EventTypeEditor.tsx`
- **BookingPage** `/book/:slug` → `app/src/pages/BookingPage.tsx`
- **Availability** `/availability` (auth) → `app/src/pages/Availability.tsx`
- **Integrations** `/integrations` (auth) → `app/src/pages/Integrations.tsx`
- **Settings** `/settings` (auth) → `app/src/pages/Settings.tsx`
- **Bookings** `/bookings` (auth) → `app/src/pages/Bookings.tsx`
- **MeetingDetail** `/bookings/:id` (auth) → `app/src/pages/MeetingDetail.tsx`
- **BookingConfirmation** `/book/:slug/confirmed` → `app/src/pages/BookingConfirmation.tsx`
- **Notifications** `/notifications` (auth) → `app/src/pages/Notifications.tsx`
- **Billing** `/settings/billing` (auth) → `app/src/pages/Billing.tsx`

## Subscription tiers

free / pro / team — gated by: maxAvailability, maxBookings, maxEventTypes, advancedFeatures, canExport, retentionDays

## Integrations (7 @molecule/* packages)

- **Database**: `@molecule/api-database-postgresql`
- **Domain resources**: `@molecule/api-resource-user`
- **Email**: `@molecule/api-emails-mailgun`
- **Frontend / UI**: `@molecule/app-calendar`, `@molecule/app-date-range-picker`, `@molecule/app-data-table`
- **Other API**: `@molecule/api-cron-node-cron`

## Required secrets

- DATABASE_URL — PostgreSQL connection string
- MAILGUN_API_KEY — Mailgun API key for booking confirmations
- MAILGUN_DOMAIN — Mailgun sending domain
