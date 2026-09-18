# Property Management

- **slug**: `property-management`
- **cluster**: real-estate-travel
- **type**: full-stack
- **layout**: admin

Buildium-like property management with units, tenants, maintenance requests, and accounting

> **This is a complete, working app, already built.** The data model, handlers, and screens below all exist on disk (paths shown). Treat this as the user's existing codebase: **adapt the listed files in place** for the request; do not recreate tables, handlers, or pages that already exist, and do not add packages for functionality already implemented here.

## Features

`auth`, `notifications`, `payments`, `reports`

## Data model (13 domain tables)

_Already created by the existing SQL in `api/migrations/` — do NOT add new migrations for these tables._

- **devices** — id, createdAt, updatedAt, userId, name, pushPlatform, pushSubscription, hasPushSubscription
- **documents** — id, user_id, kind, title, s3_key, parent_table, parent_id, uploaded_at
- **expenses** — id, user_id, property_id, kind, amount, currency, occurred_at, vendor, notes, attachment_s3_key, created_at, updatedAt
- **leases** — id, user_id, unit_id, tenant_id, secondary_tenant_ids, start_date, end_date, monthly_rent, deposit, status, renewed_from_id, created_at, …
- **maintenance_messages** — id, user_id, maintenance_request_id, author_user_id, body, attachments, created_at
- **maintenance_requests** — id, user_id, property_id, unit_id, tenant_id, title, description, priority, status, assigned_to, opened_at, scheduled_at, …
- **notifications** — id, createdAt, updatedAt
- **payments** — id, createdAt, updatedAt, userId, transactionId, productId, platformKey, data, receipt
- **properties** — id, user_id, name, address, city, state, postal_code, country, units_count, year_built, status, photo_s3_key, …
- **rent_invoices** — id, user_id, lease_id, tenant_id, period_start, period_end, due_at, amount, status, paid_at, stripe_invoice_id, created_at, …
- **rent_payments** — id, user_id, rent_invoice_id, tenant_id, lease_id, amount, currency, kind, method, reference, status, due_date, …
- **tenants** — id, user_id, property_id, unit_id, first_name, last_name, email, phone, emergency_contact, status, created_at, updatedAt
- **units** — id, user_id, property_id, unit_number, bedrooms, bathrooms, sqft, monthly_rent, status, created_at, updatedAt

## API surface (handlers)

_These endpoints already exist — open and extend the named file, never recreate it._

- **dashboard** — `api/src/handlers/dashboard.ts`
- **finances** — `api/src/handlers/finances.ts`
- **leases** — `api/src/handlers/leases.ts`
- **maintenance** — `api/src/handlers/maintenance.ts`
- **notifications** — `api/src/handlers/notifications.ts`
- **payments** — `api/src/handlers/payments.ts`
- **properties** — `api/src/handlers/properties.ts`
- **reports** — `api/src/handlers/reports.ts`
- **tenants** — `api/src/handlers/tenants.ts`
- **units** — `api/src/handlers/units.ts`

## Screens (17)

_These pages already exist — edit the named file in place, never create a parallel one._

- **Landing** `/` → `app/src/pages/Landing.tsx`
- **Login** `/login` → `app/src/pages/Login.tsx`
- **Signup** `/signup` → `app/src/pages/Signup.tsx`
- **ForgotPassword** `/forgot-password` → `app/src/pages/ForgotPassword.tsx`
- **ResetPassword** `/reset-password` → `app/src/pages/ResetPassword.tsx`
- **Dashboard** `/dashboard` (auth) → `app/src/pages/Dashboard.tsx`
- **Properties** `/properties` (auth) → `app/src/pages/Properties.tsx`
- **PropertyDetail** `/properties/:id` (auth) → `app/src/pages/PropertyDetail.tsx`
- **Tenants** `/tenants` (auth) → `app/src/pages/Tenants.tsx`
- **Maintenance** `/maintenance` (auth) → `app/src/pages/Maintenance.tsx`
- **Finances** `/finances` (auth) → `app/src/pages/Finances.tsx`
- **Settings** `/settings` (auth) → `app/src/pages/Settings.tsx`
- **TenantDetail** `/tenants/:id` (auth) → `app/src/pages/TenantDetail.tsx`
- **MaintenanceDetail** `/maintenance/:id` (auth) → `app/src/pages/MaintenanceDetail.tsx`
- **Leases** `/leases` (auth) → `app/src/pages/Leases.tsx`
- **Reports** `/reports` (auth) → `app/src/pages/Reports.tsx`
- **Notifications** `/notifications` (auth) → `app/src/pages/Notifications.tsx`

## Subscription tiers

free / pro / team — gated by: maxLeases, maxMaintenance, maxPayments, maxProperties, maxTenants, maxUnits, advancedFeatures, canExport, retentionDays

## Integrations (17 @molecule/* packages)

- **Auth & permissions**: `@molecule/api-permissions-custom`
- **Database**: `@molecule/api-database-postgresql`
- **Domain resources**: `@molecule/api-resource-user`, `@molecule/api-resource-payment`, `@molecule/api-resource-notification`
- **Email**: `@molecule/api-emails-mailgun`
- **Frontend / UI**: `@molecule/app-data-table`, `@molecule/app-calendar`, `@molecule/app-date-range-picker`, `@molecule/app-file-upload`, `@molecule/app-command-palette`
- **Other API**: `@molecule/api-reporting-database`, `@molecule/api-import-export-csv`, `@molecule/api-cron-node-cron`
- **Payments & billing**: `@molecule/api-payments-stripe`
- **Search**: `@molecule/api-search-meilisearch`
- **Uploads & media**: `@molecule/api-uploads-s3`

## Required secrets

- DATABASE_URL — PostgreSQL connection string
- STRIPE_SECRET_KEY — Stripe API secret key
- MAILGUN_API_KEY — Mailgun API key for notifications
- S3_BUCKET — S3 bucket for documents and photos
