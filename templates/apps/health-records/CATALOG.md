# Health Records

- **slug**: `health-records`
- **cluster**: health-fitness
- **type**: full-stack
- **layout**: dashboard

MyChart-like personal health records with conditions, medications, labs, vitals, immunizations, and document management

> **This is a complete, working app, already built.** The data model, handlers, and screens below all exist on disk (paths shown). Treat this as the user's existing codebase: **adapt the listed files in place** for the request; do not recreate tables, handlers, or pages that already exist, and do not add packages for functionality already implemented here.

## Features

`auth`, `search`, `notifications`, `file-upload`, `permissions`, `encryption`, `reporting`, `pdf-export`

## Data model (15 domain tables)

_Already created by the existing SQL in `api/migrations/` — do NOT add new migrations for these tables._

- **allergies** — id, user_id, allergen, substance, category, reaction, severity, onset_date, status, is_active, verified_by, notes, …
- **conditions** — id, user_id, name, icd10_code, status, severity, onset_date, resolution_date, provider_name, notes, source, created_at, …
- **devices** — id, createdAt, updatedAt, userId, name, pushPlatform, pushSubscription, hasPushSubscription
- **immunizations** — id, user_id, vaccine_name, cvx_code, dose_number, series_total, administered_date, administered_at, expiration_date, lot_number, manufacturer, administered_by, …
- **lab_result_values** — id, result_id, user_id, test_name, value, unit, reference_low, reference_high, flag, created_at
- **lab_results** — id, user_id, panel_name, test_name, category, ordered_by, ordering_provider, performing_lab, collected_date, drawn_at, result_date, resulted_at, …
- **medical_documents** — id, user_id, title, kind, category, s3_key, file_url, file_name, file_size, size_bytes, content_type, mime_type, …
- **medications** — id, user_id, name, generic_name, dosage, frequency, route, prescriber, start_date, end_date, indication, refills_remaining, …
- **notifications** — id, user_id, kind, payload, read_at, created_at
- **permission_grants** — id, owner_user_id, recipient_email, recipient_user_id, recipient_name, role, scope, starts_at, expires_at, revoked_at, message, token, …
- **visit_diagnoses** — id, visit_id, user_id, condition_id, icd10_code, description, created_at
- **visit_orders** — id, visit_id, user_id, kind, description, status, created_at
- **visits** — id, user_id, provider_id, provider_name, clinic_name, scheduled_at, completed_at, chief_complaint, assessment, plan, follow_up_at, notes, …
- **vitals** — id, user_id, recorded_at, vital_type, value, secondary_value, unit, blood_pressure_sys, blood_pressure_dia, heart_rate, temperature, weight_kg, …
- **payments** — id, createdAt, updatedAt, userId, transactionId, productId, platformKey, data, receipt

## API surface (handlers)

_These endpoints already exist — open and extend the named file, never recreate it._

- **\_seed** — `api/src/handlers/_seed.ts`
- **allergies** — `api/src/handlers/allergies.ts`
- **conditions** — `api/src/handlers/conditions.ts`
- **documents** — `api/src/handlers/documents.ts`
- **immunizations** — `api/src/handlers/immunizations.ts`
- **labs** — `api/src/handlers/labs.ts`
- **medications** — `api/src/handlers/medications.ts`
- **notifications** — `api/src/handlers/notifications.ts`
- **profile** — `api/src/handlers/profile.ts`
- **records** — `api/src/handlers/records.ts`
- **sharing** — `api/src/handlers/sharing.ts`
- **stats** — `api/src/handlers/stats.ts`
- **visits** — `api/src/handlers/visits.ts`
- **vitals** — `api/src/handlers/vitals.ts`

## Screens (21)

_These pages already exist — edit the named file in place, never create a parallel one._

- **Landing** `/` → `app/src/pages/Landing.tsx`
- **Login** `/login` → `app/src/pages/Login.tsx`
- **Signup** `/signup` → `app/src/pages/Signup.tsx`
- **ForgotPassword** `/forgot-password` → `app/src/pages/ForgotPassword.tsx`
- **ResetPassword** `/reset-password` → `app/src/pages/ResetPassword.tsx`
- **Dashboard** `/dashboard` (auth) → `app/src/pages/Dashboard.tsx`
- **Records** `/records` (auth) → `app/src/pages/Records.tsx`
- **Medications** `/medications` (auth) → `app/src/pages/Medications.tsx`
- **LabResults** `/labs` (auth) → `app/src/pages/LabResults.tsx`
- **Documents** `/documents` (auth) → `app/src/pages/Documents.tsx`
- **Sharing** `/sharing` (auth) → `app/src/pages/Sharing.tsx`
- **Settings** `/settings` (auth) → `app/src/pages/Settings.tsx`
- **RecordDetail** `/records/:id` (auth) → `app/src/pages/RecordDetail.tsx`
- **MedicationDetail** `/medications/:id` (auth) → `app/src/pages/MedicationDetail.tsx`
- **LabResultDetail** `/labs/:id` (auth) → `app/src/pages/LabResultDetail.tsx`
- **Immunizations** `/immunizations` (auth) → `app/src/pages/Immunizations.tsx`
- **Visits** `/visits` (auth) → `app/src/pages/Visits.tsx`
- **VisitDetail** `/visits/:id` (auth) → `app/src/pages/VisitDetail.tsx`
- **Notifications** `/notifications` (auth) → `app/src/pages/Notifications.tsx`
- **Profile** `/profile` (auth) → `app/src/pages/Profile.tsx`
- **InviteShare** `/sharing/new` (auth) → `app/src/pages/InviteShare.tsx`

## Subscription tiers

free / pro / team — gated by: maxAllergies, maxConditions, maxDocuments, maxImmunizations, maxLabs, maxMedications, maxVitals, advancedFeatures, canExport, retentionDays

## Integrations (18 @molecule/* packages)

- **Auth & permissions**: `@molecule/api-permissions-custom`
- **Database**: `@molecule/api-database-postgresql`
- **Domain resources**: `@molecule/api-resource-user`
- **Email**: `@molecule/api-emails-mailgun`
- **Frontend / UI**: `@molecule/app-charts`, `@molecule/app-data-table`, `@molecule/app-file-upload`, `@molecule/app-timeline`, `@molecule/app-date-range-picker`, `@molecule/app-command-palette`
- **Notifications**: `@molecule/api-push-notifications-web-push`
- **Other API**: `@molecule/api-encryption-aes`, `@molecule/api-reporting-database`, `@molecule/api-pdf-pdfkit`, `@molecule/api-import-export-csv`, `@molecule/api-cron-node-cron`
- **Search**: `@molecule/api-search-meilisearch`
- **Uploads & media**: `@molecule/api-uploads-s3`

## Required secrets

- DATABASE_URL — PostgreSQL connection string
- MEILISEARCH_API_KEY — Meilisearch API key
- ENCRYPTION_KEY — AES encryption key for PHI data
- VAPID_PUBLIC_KEY — VAPID public key for push notifications
- VAPID_PRIVATE_KEY — VAPID private key for push notifications
- MAILGUN_API_KEY — Mailgun API key for email notifications
- MAILGUN_DOMAIN — Mailgun domain
- S3_BUCKET — S3 bucket for medical documents
- S3_ACCESS_KEY_ID — S3 access key ID
- S3_SECRET_ACCESS_KEY — S3 secret access key
