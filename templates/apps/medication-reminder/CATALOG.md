# Medication Reminder

- **slug**: `medication-reminder`
- **cluster**: health-fitness
- **type**: full-stack
- **layout**: dashboard

Medisafe-like medication reminder with schedules, dose tracking, refill alerts, and adherence reports

> **This is a complete, working app, already built.** The data model, handlers, and screens below all exist on disk (paths shown). Treat this as the user's existing codebase: **adapt the listed files in place** for the request; do not recreate tables, handlers, or pages that already exist, and do not add packages for functionality already implemented here.

## Features

`auth`, `notifications`, `reporting`, `reminders`

## Data model (9 domain tables)

_Already created by the existing SQL in `api/migrations/` — do NOT add new migrations for these tables._

- **caregiver_notifications** — id, caregiver_id, dose_log_id, refill_request_id, kind, payload, sent_at, read_at, created_at
- **caregivers** — id, owner_user_id, caregiver_email, caregiver_user_id, permission, invite_token, accepted_at, created_at, updated_at
- **devices** — id, createdAt, updatedAt, userId, name, pushPlatform, pushSubscription, hasPushSubscription
- **dose_logs** — id, schedule_id, medication_id, user_id, scheduled_at, scheduled_date, scheduled_time, taken_at, status, snooze_until, skip_reason, notes, …
- **medication_schedules** — id, medication_id, user_id, frequency_kind, time_of_day, times_of_day, days_of_week, interval_days, dose_quantity, with_food, reminder_minutes_before, start_date, …
- **medications** — id, user_id, name, generic_name, dosage_amount, dosage_unit, dosage, form, route, color, pill_color, shape, …
- **notifications** — id, user_id, kind, title, body, href, payload, read, read_at, created_at
- **payments** — id, createdAt, updatedAt, userId, transactionId, productId, platformKey, data, receipt
- **refill_requests** — id, medication_id, user_id, pharmacy, days_supply_remaining, status, requested_at, contacted_at, filled_at, notes, created_at, updated_at

## API surface (handlers)

_These endpoints already exist — open and extend the named file, never recreate it._

- **adherence** — `api/src/handlers/adherence.ts`
- **caregivers** — `api/src/handlers/caregivers.ts`
- **doses** — `api/src/handlers/doses.ts`
- **medications** — `api/src/handlers/medications.ts`
- **notifications** — `api/src/handlers/notifications.ts`
- **refills** — `api/src/handlers/refills.ts`
- **reports** — `api/src/handlers/reports.ts`
- **schedules** — `api/src/handlers/schedules.ts`

## Screens (16)

_These pages already exist — edit the named file in place, never create a parallel one._

- **Landing** `/` → `app/src/pages/Landing.tsx`
- **Login** `/login` → `app/src/pages/Login.tsx`
- **Signup** `/signup` → `app/src/pages/Signup.tsx`
- **ForgotPassword** `/forgot-password` → `app/src/pages/ForgotPassword.tsx`
- **ResetPassword** `/reset-password` → `app/src/pages/ResetPassword.tsx`
- **Dashboard** `/dashboard` (auth) → `app/src/pages/Dashboard.tsx`
- **Medications** `/medications` (auth) → `app/src/pages/Medications.tsx`
- **AddMedication** `/medications/new` (auth) → `app/src/pages/AddMedication.tsx`
- **MedicationDetail** `/medications/:id` (auth) → `app/src/pages/MedicationDetail.tsx`
- **Schedule** `/schedule` (auth) → `app/src/pages/Schedule.tsx`
- **Caregivers** `/caregivers` (auth) → `app/src/pages/Caregivers.tsx`
- **Settings** `/settings` (auth) → `app/src/pages/Settings.tsx`
- **Profile** `/profile` (auth) → `app/src/pages/Profile.tsx`
- **Notifications** `/notifications` (auth) → `app/src/pages/Notifications.tsx`
- **AdherenceReport** `/reports` (auth) → `app/src/pages/AdherenceReport.tsx`
- **Refills** `/refills` (auth) → `app/src/pages/Refills.tsx`

## Subscription tiers

free / pro / team — gated by: maxAdherence, maxDoses, maxMedications, maxRefills, maxSchedules, advancedFeatures, canExport, retentionDays

## Integrations (11 @molecule/* packages)

- **Database**: `@molecule/api-database-postgresql`
- **Domain resources**: `@molecule/api-resource-user`
- **Email**: `@molecule/api-emails-mailgun`
- **Frontend / UI**: `@molecule/app-charts`, `@molecule/app-calendar`, `@molecule/app-data-table`, `@molecule/app-command-palette`
- **Notifications**: `@molecule/api-push-notifications-web-push`
- **Other API**: `@molecule/api-reporting-database`, `@molecule/api-cron-node-cron`, `@molecule/api-import-export-csv`

## Required secrets

- DATABASE_URL — PostgreSQL connection string
- VAPID_PUBLIC_KEY — VAPID public key for push notifications
- VAPID_PRIVATE_KEY — VAPID private key for push notifications
- MAILGUN_API_KEY — Mailgun API key for email notifications
- MAILGUN_DOMAIN — Mailgun domain
