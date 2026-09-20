# Field Service

- **slug**: `field-service`
- **cluster**: business-saas
- **type**: full-stack
- **layout**: admin

Jobber-like field service management with quotes, job dispatch scheduling, technician assignment, checklists, and invoicing — with built-in Stripe-backed subscription tiers

> **This is a complete, working app, already built.** The data model, handlers, and screens below all exist on disk (paths shown). Treat this as the user's existing codebase: **adapt the listed files in place** for the request; do not recreate tables, handlers, or pages that already exist, and do not add packages for functionality already implemented here.

## Features

`auth`, `search`, `calendar`, `notifications`, `subscriptions`

## Data model (12 domain tables)

_Already created by the existing SQL in `api/migrations/` — do NOT add new migrations for these tables._

- **customers** — id, owner_id, name, email, phone, address, notes, created_at, updated_at, updatedAt
- **devices** — id, createdAt, updatedAt, userId, name, pushPlatform, pushSubscription, hasPushSubscription
- **invoice_items** — id, invoice_id, description, qty, unit, rate_cents, position, created_at, updatedAt
- **invoices** — id, owner_id, job_id, customer_id, number, status, total_cents, issued_at, sent_at, paid_at, notes, created_at, …
- **job_checklist** — id, job_id, label, done, done_at, created_at, updatedAt
- **job_notes** — id, job_id, author, body, created_at, updatedAt
- **jobs** — id, owner_id, customer_id, quote_id, title, description, address, scheduled_start, scheduled_end, status, technician_id, completed_at, …
- **notifications** — id, user_id, kind, title, body, link, payload, read_at, created_at, updatedAt
- **payments** — id, createdAt, updatedAt, userId, transactionId, productId, platformKey, data, receipt
- **quote_items** — id, quote_id, description, qty, unit, rate_cents, position, created_at, updatedAt
- **quotes** — id, owner_id, customer_id, title, status, valid_until, total_cents, notes, sent_at, accepted_at, declined_at, created_at, …
- **technicians** — id, owner_id, name, trade, phone, email, skills, active, photo_url, created_at, updated_at, updatedAt

## API surface (handlers)

_These endpoints already exist — open and extend the named file, never recreate it._

- **\_seed** — `api/src/handlers/_seed.ts`
- **\_shape** — `api/src/handlers/_shape.ts`
- **customers** — `api/src/handlers/customers.ts`
- **invoices** — `api/src/handlers/invoices.ts`
- **jobs** — `api/src/handlers/jobs.ts`
- **notifications** — `api/src/handlers/notifications.ts`
- **quotes** — `api/src/handlers/quotes.ts`
- **technicians** — `api/src/handlers/technicians.ts`

## Screens (26)

_These pages already exist — edit the named file in place, never create a parallel one._

- **Landing** `/` → `app/src/pages/Landing.tsx`
- **Login** `/login` → `app/src/pages/Login.tsx`
- **Signup** `/signup` → `app/src/pages/Signup.tsx`
- **ForgotPassword** `/forgot-password` → `app/src/pages/ForgotPassword.tsx`
- **ResetPassword** `/reset-password` → `app/src/pages/ResetPassword.tsx`
- **Pricing** `/pricing` → `app/src/pages/Pricing.tsx`
- **About** `/about` → `app/src/pages/About.tsx`
- **Privacy** `/privacy` → `app/src/pages/Privacy.tsx`
- **Terms** `/terms` → `app/src/pages/Terms.tsx`
- **Dashboard** `/dashboard` (auth) → `app/src/pages/Dashboard.tsx`
- **Customers** `/customers` (auth) → `app/src/pages/Customers.tsx`
- **NewCustomer** `/customers/new` (auth) → `app/src/pages/NewCustomer.tsx`
- **CustomerDetail** `/customers/:id` (auth) → `app/src/pages/CustomerDetail.tsx`
- **Quotes** `/quotes` (auth) → `app/src/pages/Quotes.tsx`
- **QuoteNew** `/quotes/new` (auth) → `app/src/pages/QuoteNew.tsx`
- **QuoteDetail** `/quotes/:id` (auth) → `app/src/pages/QuoteDetail.tsx`
- **QuoteEdit** `/quotes/:id/edit` (auth) → `app/src/pages/QuoteEdit.tsx`
- **Jobs** `/jobs` (auth) → `app/src/pages/Jobs.tsx`
- **JobDetail** `/jobs/:id` (auth) → `app/src/pages/JobDetail.tsx`
- **Dispatch** `/dispatch` (auth) → `app/src/pages/Dispatch.tsx`
- **Technicians** `/technicians` (auth) → `app/src/pages/Technicians.tsx`
- **Invoices** `/invoices` (auth) → `app/src/pages/Invoices.tsx`
- **InvoiceDetail** `/invoices/:id` (auth) → `app/src/pages/InvoiceDetail.tsx`
- **Notifications** `/notifications` (auth) → `app/src/pages/Notifications.tsx`
- **Settings** `/settings` (auth) → `app/src/pages/Settings.tsx`
- **PlanUpdated** `/plan-updated` (auth) → `app/src/pages/PlanUpdated.tsx`

## Subscription tiers

free / pro / team — gated by: maxCustomers, maxQuotes, maxJobs, maxTechnicians, maxInvoices, advancedFeatures, canExport, retentionDays

## Integrations (11 @molecule/* packages)

- **Database**: `@molecule/api-database-postgresql`
- **Domain resources**: `@molecule/api-resource-user`, `@molecule/api-resource-payment`
- **Email**: `@molecule/api-emails-mailgun`, `@molecule/api-email-templates`
- **Frontend / UI**: `@molecule/app-sidebar-layout-react`, `@molecule/app-notification-feed-react`
- **Other API**: `@molecule/api-cron-node-cron`
- **Payments & billing**: `@molecule/api-payments-stripe`, `@molecule/api-entitlements`, `@molecule/app-billing-react`

## Required secrets

- DATABASE_URL — PostgreSQL connection string
- MAILGUN_API_KEY — Mailgun API key for quote and invoice emails
- MAILGUN_DOMAIN — Mailgun sending domain
- STRIPE_SECRET_KEY — Stripe secret API key (sk_test_... in test mode)
- STRIPE_WEBHOOK_SECRET — Stripe webhook signing secret (whsec_...)
