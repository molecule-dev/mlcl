# Accounting / Invoicing

- **slug**: `accounting-invoicing`
- **cluster**: business-saas
- **type**: full-stack
- **layout**: dashboard

QuickBooks-like accounting with invoices, expenses, reports, and reconciliation

> **This is a complete, working app, already built.** The data model, handlers, and screens below all exist on disk (paths shown). Treat this as the user's existing codebase: **adapt the listed files in place** for the request; do not recreate tables, handlers, or pages that already exist, and do not add packages for functionality already implemented here.

## Features

`auth`, `search`, `invoices`, `expenses`, `reports`, `pdf-export`, `reconciliation`

## Data model (13 domain tables)

_Already created by the existing SQL in `api/migrations/` — do NOT add new migrations for these tables._

- **accounts** — id, user_id, code, name, type, description, balance, currency, active, created_at, updated_at
- **customers** — id, user_id, company, contact_name, contact_email, contact_phone, address, payment_terms, tags, ytd_billed_cents, total_billed_cents, outstanding_cents, …
- **devices** — id, createdAt, updatedAt, userId, name, pushPlatform, pushSubscription, hasPushSubscription
- **expenses** — id, user_id, amount_cents, amount, currency, merchant, category, category_color, occurred_at, date, has_receipt, receipt_url, …
- **invoice_line_items** — id, invoice_id, position, description, quantity, unit_price, amount
- **invoice_payments** — id, user_id, invoice_id, customer_name, invoice_number, amount_cents, method, reference, status, received_at, reconciled, created_at
- **invoices** — id, user_id, invoice_number, customer_id, customer_name, status, issue_date, due_date, line_items, subtotal_cents, tax_rate_pct, tax_cents, …
- **notifications** — id, user_id, type, title, body, href, unread, created_at
- **payments** — id, createdAt, updatedAt, userId, transactionId, productId, platformKey, data, receipt
- **tax_rates** — id, user_id, name, rate_pct, region, is_default, created_at
- **company_profile** — user_id, legal_name, billing_email, tax_id, address, default_tax_rate_pct, filing_method, fiscal_year_start, created_at, updated_at
- **integrations** — id, user_id, name, status, last_synced_at, created_at, updated_at
- **team_members** — id, user_id, name, email, role, created_at

## API surface (handlers)

_These endpoints already exist — open and extend the named file, never recreate it._

- **accounts** — `api/src/handlers/accounts.ts`
- **customers** — `api/src/handlers/customers.ts`
- **expenses** — `api/src/handlers/expenses.ts`
- **invoices** — `api/src/handlers/invoices.ts`
- **notifications** — `api/src/handlers/notifications.ts`
- **payments** — `api/src/handlers/payments.ts`
- **reports** — `api/src/handlers/reports.ts`
- **settings** — `api/src/handlers/settings.ts`

## Screens (18)

_These pages already exist — edit the named file in place, never create a parallel one._

- **Landing** `/` → `app/src/pages/Landing.tsx`
- **Login** `/login` → `app/src/pages/Login.tsx`
- **Signup** `/signup` → `app/src/pages/Signup.tsx`
- **ForgotPassword** `/forgot-password` → `app/src/pages/ForgotPassword.tsx`
- **ResetPassword** `/reset-password` → `app/src/pages/ResetPassword.tsx`
- **Dashboard** `/dashboard` (auth) → `app/src/pages/Dashboard.tsx`
- **Invoices** `/invoices` (auth) → `app/src/pages/Invoices.tsx`
- **InvoiceDetail** `/invoices/:id` (auth) → `app/src/pages/InvoiceDetail.tsx`
- **NewInvoice** `/invoices/new` (auth) → `app/src/pages/NewInvoice.tsx`
- **Expenses** `/expenses` (auth) → `app/src/pages/Expenses.tsx`
- **Reports** `/reports` (auth) → `app/src/pages/Reports.tsx`
- **Customers** `/customers` (auth) → `app/src/pages/Customers.tsx`
- **Settings** `/settings` (auth) → `app/src/pages/Settings.tsx`
- **CustomerDetail** `/customers/:id` (auth) → `app/src/pages/CustomerDetail.tsx`
- **ExpenseDetail** `/expenses/:id` (auth) → `app/src/pages/ExpenseDetail.tsx`
- **NewExpense** `/expenses/new` (auth) → `app/src/pages/NewExpense.tsx`
- **Payments** `/payments` (auth) → `app/src/pages/Payments.tsx`
- **Taxes** `/taxes` (auth) → `app/src/pages/Taxes.tsx`

## Subscription tiers

free / pro / team — gated by: maxAccounts, maxExpenses, maxInvoices, advancedFeatures, canExport, retentionDays

## Integrations (12 @molecule/* packages)

- **Auth & permissions**: `@molecule/api-permissions-custom`
- **Database**: `@molecule/api-database-postgresql`
- **Domain resources**: `@molecule/api-resource-user`
- **Email**: `@molecule/api-emails-mailgun`
- **Frontend / UI**: `@molecule/app-data-table`, `@molecule/app-date-range-picker`, `@molecule/app-command-palette`
- **Other API**: `@molecule/api-audit-database`, `@molecule/api-import-export-csv`, `@molecule/api-reporting-database`, `@molecule/api-pdf-pdfkit`
- **Search**: `@molecule/api-search-meilisearch`

## Required secrets

- DATABASE_URL — PostgreSQL connection string
- MEILISEARCH_API_KEY — MeiliSearch API key
- MAILGUN_API_KEY — Mailgun API key for invoice emails
- MAILGUN_DOMAIN — Mailgun sending domain
