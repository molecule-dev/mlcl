# Time Tracking

- **slug**: `time-tracking`
- **cluster**: productivity
- **type**: full-stack
- **layout**: dashboard

Toggl-like time tracking with timer, projects, reports, and billing

> **This is a complete, working app, already built.** The data model, handlers, and screens below all exist on disk (paths shown). Treat this as the user's existing codebase: **adapt the listed files in place** for the request; do not recreate tables, handlers, or pages that already exist, and do not add packages for functionality already implemented here.

## Features

`auth`, `timer`, `projects`, `reports`, `billing`

## Data model (9 domain tables)

_Already created by the existing SQL in `api/migrations/` — do NOT add new migrations for these tables._

- **clients** — id, owner_id, name, email, billing_currency, billing_address, hourly_rate_cents, archived, created_at, updated_at
- **devices** — id, createdAt, updatedAt, userId, name, pushPlatform, pushSubscription, hasPushSubscription
- **invoice_line_items** — id, invoice_id, description, quantity, rate_cents, amount_cents, source_entry_ids, created_at
- **invoices** — id, owner_id, client_id, number, issued_at, due_at, currency, subtotal_cents, tax_cents, total_cents, status, notes, …
- **projects** — id, owner_id, client_id, name, description, color, budget_cents, billable, hourly_rate_cents, archived, created_at, updated_at
- **resource_tags** — id, tagId, resourceType, resourceId, createdAt
- **tags** — id, name, slug, color, description, createdAt, updatedAt
- **time_entries** — id, owner_id, project_id, description, started_at, ended_at, duration_seconds, is_billable, tags, invoiced, created_at, updated_at
- **payments** — id, createdAt, updatedAt, userId, transactionId, productId, platformKey, data, receipt

## API surface (handlers)

_These endpoints already exist — open and extend the named file, never recreate it._

- **clients** — `api/src/handlers/clients.ts`
- **entries** — `api/src/handlers/entries.ts`
- **invoices** — `api/src/handlers/invoices.ts`
- **projects** — `api/src/handlers/projects.ts`
- **reports** — `api/src/handlers/reports.ts`

## Screens (16)

_These pages already exist — edit the named file in place, never create a parallel one._

- **Landing** `/` → `app/src/pages/Landing.tsx`
- **Login** `/login` → `app/src/pages/Login.tsx`
- **Signup** `/signup` → `app/src/pages/Signup.tsx`
- **ForgotPassword** `/forgot-password` → `app/src/pages/ForgotPassword.tsx`
- **ResetPassword** `/reset-password` → `app/src/pages/ResetPassword.tsx`
- **Dashboard** `/dashboard` (auth) → `app/src/pages/Dashboard.tsx`
- **TimeEntries** `/entries` (auth) → `app/src/pages/TimeEntries.tsx`
- **Timesheet** `/timesheet` (auth) → `app/src/pages/Timesheet.tsx`
- **Projects** `/projects` (auth) → `app/src/pages/Projects.tsx`
- **ProjectDetail** `/projects/:id` (auth) → `app/src/pages/ProjectDetail.tsx`
- **Clients** `/clients` (auth) → `app/src/pages/Clients.tsx`
- **ClientDetail** `/clients/:id` (auth) → `app/src/pages/ClientDetail.tsx`
- **Reports** `/reports` (auth) → `app/src/pages/Reports.tsx`
- **Invoices** `/invoices` (auth) → `app/src/pages/Invoices.tsx`
- **InvoiceDetail** `/invoices/:id` (auth) → `app/src/pages/InvoiceDetail.tsx`
- **Settings** `/settings` (auth) → `app/src/pages/Settings.tsx`

## Subscription tiers

free / pro / team — gated by: maxClients, maxEntries, maxProjects, advancedFeatures, canExport, retentionDays

## Integrations (9 @molecule/* packages)

- **Database**: `@molecule/api-database-postgresql`
- **Domain resources**: `@molecule/api-resource-user`, `@molecule/api-resource-tag`
- **Frontend / UI**: `@molecule/app-data-table`, `@molecule/app-date-range-picker`, `@molecule/app-keyboard-shortcuts-hotkeys`, `@molecule/app-command-palette-cmdk`
- **Other API**: `@molecule/api-reporting-database`, `@molecule/api-import-export-csv`

## Required secrets

- DATABASE_URL — PostgreSQL connection string
