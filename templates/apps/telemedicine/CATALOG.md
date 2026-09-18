# Telemedicine

- **slug**: `telemedicine`
- **cluster**: health-fitness
- **type**: full-stack
- **layout**: dashboard

Teladoc-like telemedicine platform with appointments, video consultations, medical records, and prescriptions

> **This is a complete, working app, already built.** The data model, handlers, and screens below all exist on disk (paths shown). Treat this as the user's existing codebase: **adapt the listed files in place** for the request; do not recreate tables, handlers, or pages that already exist, and do not add packages for functionality already implemented here.

## Features

`auth`, `search`, `notifications`, `video`, `calendar`, `file-upload`, `permissions`

## Data model (13 domain tables)

_Already created by the existing SQL in `api/migrations/` — do NOT add new migrations for these tables._

- **appointments** — id, patient_user_id, patient_id, provider_user_id, provider_id, scheduled_at, duration_minutes, type, reason, notes, summary, status, …
- **availability_slots** — id, provider_id, starts_at, ends_at, date, start_time, end_time, is_booked, recurring_rule_id, created_at
- **consultation_messages** — id, consultation_id, appointment_id, sender_user_id, sender_id, sender_role, body, content, type, attachments, sent_at, read_at, …
- **consultations** — id, appointment_id, patient_user_id, patient_id, provider_user_id, provider_id, started_at, ended_at, status, room_provider, room_external_id, recording_s3_key, …
- **devices** — id, createdAt, updatedAt, userId, name, pushPlatform, pushSubscription, hasPushSubscription
- **medical_records** — id, patient_user_id, patient_id, provider_user_id, provider_id, consultation_id, encounter_id, kind, type, title, description, data, …
- **notifications** — id, user_id, kind, payload, read_at, created_at
- **payments** — id, createdAt, updatedAt, userId, transactionId, productId, platformKey, data, receipt
- **pharmacies** — id, name, address, phone, ncpdp_id, created_at
- **prescriptions** — id, appointment_id, consultation_id, provider_user_id, provider_id, patient_user_id, patient_id, drug_name, medication_name, ndc, dosage, frequency, …
- **providers** — id, user_id, display_name, npi, license_number, license_state, specialty_id, specialty, bio, hourly_rate_cents, consultation_fee, photo_s3_key, …
- **record_shares** — id, record_id, owner_user_id, shared_with_provider_id, scope, expires_at, revoked_at, created_at
- **specialties** — id, slug, label, icon, created_at

## API surface (handlers)

_These endpoints already exist — open and extend the named file, never recreate it._

- **\_seed** — `api/src/handlers/_seed.ts`
- **appointments** — `api/src/handlers/appointments.ts`
- **consultations** — `api/src/handlers/consultations.ts`
- **notifications** — `api/src/handlers/notifications.ts`
- **portal** — `api/src/handlers/portal.ts`
- **prescriptions** — `api/src/handlers/prescriptions.ts`
- **providers** — `api/src/handlers/providers.ts`
- **records** — `api/src/handlers/records.ts`

## Screens (16)

_These pages already exist — edit the named file in place, never create a parallel one._

- **Landing** `/` → `app/src/pages/Landing.tsx`
- **Login** `/login` → `app/src/pages/Login.tsx`
- **Signup** `/signup` → `app/src/pages/Signup.tsx`
- **ForgotPassword** `/forgot-password` → `app/src/pages/ForgotPassword.tsx`
- **ResetPassword** `/reset-password` → `app/src/pages/ResetPassword.tsx`
- **Dashboard** `/dashboard` (auth) → `app/src/pages/Dashboard.tsx`
- **Appointments** `/appointments` (auth) → `app/src/pages/Appointments.tsx`
- **Consult** `/consult/:id` (auth) → `app/src/pages/Consult.tsx`
- **AppointmentDetail** `/appointments/:id` (auth) → `app/src/pages/AppointmentDetail.tsx`
- **Patients** `/patients` (auth) → `app/src/pages/Patients.tsx`
- **PatientDetail** `/patients/:id` (auth) → `app/src/pages/PatientDetail.tsx`
- **Prescriptions** `/prescriptions` (auth) → `app/src/pages/Prescriptions.tsx`
- **MedicalRecords** `/records` (auth) → `app/src/pages/MedicalRecords.tsx`
- **Messages** `/messages` (auth) → `app/src/pages/Messages.tsx`
- **Notifications** `/notifications` (auth) → `app/src/pages/Notifications.tsx`
- **Settings** `/settings` (auth) → `app/src/pages/Settings.tsx`

## Subscription tiers

free / pro / team — gated by: maxAppointments, maxConsultations, maxPrescriptions, maxProviders, maxRecords, advancedFeatures, canExport, retentionDays

## Integrations (16 @molecule/* packages)

- **Auth & permissions**: `@molecule/api-permissions-custom`
- **Database**: `@molecule/api-database-postgresql`
- **Domain resources**: `@molecule/api-resource-user`, `@molecule/api-resource-notification`
- **Email**: `@molecule/api-emails-mailgun`
- **Frontend / UI**: `@molecule/app-calendar`, `@molecule/app-data-table`, `@molecule/app-file-upload`, `@molecule/app-command-palette`
- **Notifications**: `@molecule/api-push-notifications-web-push`
- **Other API**: `@molecule/api-cron-node-cron`
- **Realtime**: `@molecule/api-realtime-socketio`, `@molecule/app-realtime-socketio`
- **Search**: `@molecule/api-search-meilisearch`
- **Uploads & media**: `@molecule/api-uploads-s3`, `@molecule/app-video`

## Required secrets

- DATABASE_URL — PostgreSQL connection string
- MEILISEARCH_API_KEY — Meilisearch API key
- VAPID_PUBLIC_KEY — VAPID public key for push notifications
- VAPID_PRIVATE_KEY — VAPID private key for push notifications
- MAILGUN_API_KEY — Mailgun API key for email notifications
- MAILGUN_DOMAIN — Mailgun domain
- S3_BUCKET — S3 bucket for medical documents
- S3_ACCESS_KEY_ID — S3 access key ID
- S3_SECRET_ACCESS_KEY — S3 secret access key
