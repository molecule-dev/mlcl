# Pet Care

- **slug**: `pet-care`
- **cluster**: operations-iot
- **type**: full-stack
- **layout**: dashboard

Rover-like pet care platform with pet profiles, vet records, sitter bookings, and health tracking

> **This is a complete, working app, already built.** The data model, handlers, and screens below all exist on disk (paths shown). Treat this as the user's existing codebase: **adapt the listed files in place** for the request; do not recreate tables, handlers, or pages that already exist, and do not add packages for functionality already implemented here.

## Features

`auth`, `search`, `upload`, `calendar`, `gallery`, `notifications`

## Data model (13 domain tables)

_Already created by the existing SQL in `api/migrations/` — do NOT add new migrations for these tables._

- **booking_messages** — id, booking_id, sender_user_id, body, attachments, sent_at, read_at
- **bookings** — id, userId, resourceType, resourceId, status, startTime, endTime, duration, notes, metadata, createdAt, updatedAt, …
- **devices** — id, createdAt, updatedAt, userId, name, pushPlatform, pushSubscription, hasPushSubscription
- **notifications** — id, user_id, kind, payload, read_at, created_at
- **pet_medications** — id, pet_id, name, dosage, frequency, prescriber, start_date, end_date, instructions, is_active, created_at, updated_at
- **pet_vaccinations** — id, pet_id, vaccine_name, administered_on, due_on, lot_number, vet_id, created_at
- **pet_vitals** — id, pet_id, recorded_at, weight_kg, temperature_c, heart_rate, notes, created_at
- **pets** — id, owner_user_id, name, species, breed, sex, neutered, date_of_birth, weight_kg, color, microchip_id, photo_url, …
- **sitter_availability** — id, sitter_id, weekday, start_time, end_time, is_blocked
- **sitter_blackouts** — id, sitter_id, starts_at, ends_at, reason
- **sitter_reviews** — id, booking_id, sitter_id, reviewer_user_id, rating, body, created_at
- **sitters** — id, user_id, display_name, bio, services, hourly_rate_cents, location_city, location_lat, location_lon, avg_rating, total_bookings, is_verified, …
- **vet_records** — id, pet_id, kind, title, occurred_on, vet_name, clinic_name, summary, attachment_s3_key, follow_up_date, created_at, updated_at

## API surface (handlers)

_These endpoints already exist — open and extend the named file, never recreate it._

- **bookings** — `api/src/handlers/bookings.ts`
- **health** — `api/src/handlers/health.ts`
- **medications** — `api/src/handlers/medications.ts`
- **notifications** — `api/src/handlers/notifications.ts`
- **pets** — `api/src/handlers/pets.ts`
- **sitters** — `api/src/handlers/sitters.ts`
- **vet-records** — `api/src/handlers/vet-records.ts`

## Screens (18)

_These pages already exist — edit the named file in place, never create a parallel one._

- **Landing** `/` → `app/src/pages/Landing.tsx`
- **Login** `/login` → `app/src/pages/Login.tsx`
- **Signup** `/signup` → `app/src/pages/Signup.tsx`
- **ForgotPassword** `/forgot-password` → `app/src/pages/ForgotPassword.tsx`
- **ResetPassword** `/reset-password` → `app/src/pages/ResetPassword.tsx`
- **Dashboard** `/dashboard` (auth) → `app/src/pages/Dashboard.tsx`
- **Pets** `/pets` (auth) → `app/src/pages/Pets.tsx`
- **PetDetail** `/pets/:id` (auth) → `app/src/pages/PetDetail.tsx`
- **Sitters** `/sitters` (auth) → `app/src/pages/Sitters.tsx`
- **Bookings** `/bookings` (auth) → `app/src/pages/Bookings.tsx`
- **VetRecords** `/vet-records` (auth) → `app/src/pages/VetRecords.tsx`
- **Settings** `/settings` (auth) → `app/src/pages/Settings.tsx`
- **SitterDetail** `/sitters/:id` (auth) → `app/src/pages/SitterDetail.tsx`
- **BookingDetail** `/bookings/:id` (auth) → `app/src/pages/BookingDetail.tsx`
- **VetRecordDetail** `/vet-records/:id` (auth) → `app/src/pages/VetRecordDetail.tsx`
- **Medications** `/medications` (auth) → `app/src/pages/Medications.tsx`
- **Notifications** `/notifications` (auth) → `app/src/pages/Notifications.tsx`
- **Messages** `/messages` (auth) → `app/src/pages/Messages.tsx`

## Subscription tiers

free / pro / team — gated by: maxBookings, maxHealth, maxPets, maxSitters, advancedFeatures, canExport, retentionDays

## Integrations (13 @molecule/* packages)

- **Database**: `@molecule/api-database-postgresql`
- **Domain resources**: `@molecule/api-resource-user`, `@molecule/api-resource-booking`
- **Email**: `@molecule/api-emails-mailgun`
- **Frontend / UI**: `@molecule/app-data-table`, `@molecule/app-calendar`, `@molecule/app-file-upload`, `@molecule/app-gallery`, `@molecule/app-command-palette`
- **Other API**: `@molecule/api-cron-node-cron`
- **Search**: `@molecule/api-search-meilisearch`
- **Uploads & media**: `@molecule/api-uploads-s3`, `@molecule/api-image-sharp`

## Required secrets

- DATABASE_URL — PostgreSQL connection string
- MEILISEARCH_API_KEY — MeiliSearch API key
- AWS_S3_BUCKET — S3 bucket for pet photos
- AWS_ACCESS_KEY_ID — AWS access key
- AWS_SECRET_ACCESS_KEY — AWS secret key
- MAILGUN_API_KEY — Mailgun API key for booking notifications
- MAILGUN_DOMAIN — Mailgun sending domain
