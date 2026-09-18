# Invoice / Billing

- **slug**: `invoice-billing`
- **cluster**: finance
- **type**: full-stack
- **layout**: dashboard

FreshBooks-like invoicing with clients, invoices, recurring billing, payments, and tax reports

> **This is a complete, working app, already built.** The data model, handlers, and screens below all exist on disk (paths shown). Treat this as the user's existing codebase: **adapt the listed files in place** for the request; do not recreate tables, handlers, or pages that already exist, and do not add packages for functionality already implemented here.

## Features

`auth`, `payments`, `reports`, `import-export`

## Data model (7 domain tables)

_Already created by the existing SQL in `api/migrations/` — do NOT add new migrations for these tables._

- **clients** — id, user_id, name, email, company, phone, address, tax_id, notes, total_billed, total_paid, created_at, …
- **devices** — id, createdAt, updatedAt, userId, name, pushPlatform, pushSubscription, hasPushSubscription
- **invoice_payments** — id, user_id, invoice_id, invoice_number, client_name, amount, method, reference, status, created_at
- **invoices** — id, user_id, client_id, client_name, client_company, invoice_number, items, subtotal, tax_rate, tax_amount, total, currency, …
- **payments** — id, createdAt, updatedAt, userId, transactionId, productId, platformKey, data, receipt
- **recurring_invoices** — id, user_id, client_id, client_name, label, items, amount, currency, cadence, frequency, start_date, next_run_at, …
- **tax_rates** — id, user_id, name, rate_pct, region, created_at, updatedAt

## API surface (handlers)

_These endpoints already exist — open and extend the named file, never recreate it._

- **\_decorate** — `api/src/handlers/_decorate.ts`
- **\_seed** — `api/src/handlers/_seed.ts`
- **clients** — `api/src/handlers/clients.ts`
- **dashboard** — `api/src/handlers/dashboard.ts`
- **exports** — `api/src/handlers/exports.ts`
- **invoices** — `api/src/handlers/invoices.ts`
- **notifications** — `api/src/handlers/notifications.ts`
- **payments** — `api/src/handlers/payments.ts`
- **profile** — `api/src/handlers/profile.ts`
- **recurring** — `api/src/handlers/recurring.ts`
- **reports** — `api/src/handlers/reports.ts`
- **tax-rates** — `api/src/handlers/tax-rates.ts`

## Screens (15)

_These pages already exist — edit the named file in place, never create a parallel one._

- **Landing** `/` → `app/src/pages/Landing.tsx`
- **Login** `/login` → `app/src/pages/Login.tsx`
- **Signup** `/signup` → `app/src/pages/Signup.tsx`
- **ForgotPassword** `/forgot-password` → `app/src/pages/ForgotPassword.tsx`
- **ResetPassword** `/reset-password` → `app/src/pages/ResetPassword.tsx`
- **Dashboard** `/dashboard` (auth) → `app/src/pages/Dashboard.tsx`
- **Invoices** `/invoices` (auth) → `app/src/pages/Invoices.tsx`
- **InvoiceEditor** `/invoices/new` (auth) → `app/src/pages/InvoiceEditor.tsx`
- **InvoiceDetail** `/invoices/:id` (auth) → `app/src/pages/InvoiceDetail.tsx`
- **Clients** `/clients` (auth) → `app/src/pages/Clients.tsx`
- **ClientDetail** `/clients/:id` (auth) → `app/src/pages/ClientDetail.tsx`
- **Payments** `/payments` (auth) → `app/src/pages/Payments.tsx`
- **Reports** `/reports` (auth) → `app/src/pages/Reports.tsx`
- **Notifications** `/notifications` (auth) → `app/src/pages/Notifications.tsx`
- **Settings** `/settings` (auth) → `app/src/pages/Settings.tsx`

## Subscription tiers

free / pro / team — gated by: maxClients, maxInvoices, maxPayments, maxRecurring, advancedFeatures, canExport, retentionDays

## Integrations (10 @molecule/* packages)

- **Database**: `@molecule/api-database-postgresql`
- **Domain resources**: `@molecule/api-resource-user`
- **Email**: `@molecule/api-emails-mailgun`
- **Frontend / UI**: `@molecule/app-data-table`, `@molecule/app-date-range-picker`, `@molecule/app-virtual-scroll`
- **Other API**: `@molecule/api-cron-node-cron`, `@molecule/api-reporting-database`, `@molecule/api-import-export-csv`
- **Payments & billing**: `@molecule/api-payments-stripe`

## Required secrets

- DATABASE_URL — PostgreSQL connection string
- STRIPE_SECRET_KEY — Stripe secret key for payment processing
- STRIPE_PUBLISHABLE_KEY — Stripe publishable key
- MAILGUN_API_KEY — Mailgun API key for invoice emails
