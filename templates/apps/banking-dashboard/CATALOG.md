# Banking Dashboard

- **slug**: `banking-dashboard`
- **cluster**: finance
- **type**: full-stack
- **layout**: dashboard

Neobank-like dashboard with accounts, transfers, transaction history, and statements

> **This is a complete, working app, already built.** The data model, handlers, and screens below all exist on disk (paths shown). Treat this as the user's existing codebase: **adapt the listed files in place** for the request; do not recreate tables, handlers, or pages that already exist, and do not add packages for functionality already implemented here.

## Features

`auth`, `notifications`, `audit-log`, `reports`

## Data model (9 domain tables)

_Already created by the existing SQL in `api/migrations/` — do NOT add new migrations for these tables._

- **bank_accounts** — id, user_id, name, kind, institution, mask, currency, balance_cents, available_cents, account_number_encrypted, routing_number_encrypted, status, …
- **bank_transactions** — id, user_id, account_id, amount_cents, merchant, category, method, status, posted_at, running_balance_cents, created_at, updatedAt
- **debit_cards** — id, user_id, account_id, card_number_encrypted, expiry, name_on_card, status, daily_limit_cents, created_at, updatedAt
- **devices** — id, createdAt, updatedAt, userId, name, pushPlatform, pushSubscription, hasPushSubscription
- **notifications** — id, createdAt, updatedAt
- **payments** — id, createdAt, updatedAt, userId, transactionId, productId, platformKey, data, receipt
- **recipients** — id, user_id, institution, name, mask, kind, last_used_at, created_at, updatedAt
- **statements** — id, user_id, account_id, account_name, period_start, period_end, ready_at, size_bytes, url, created_at, updatedAt
- **transfers** — id, user_id, from_account_id, to_account_id, recipient_id, amount_cents, description, status, scheduled_date, completed_at, created_at, updatedAt

## API surface (handlers)

_These endpoints already exist — open and extend the named file, never recreate it._

- **accounts** — `api/src/handlers/accounts.ts`
- **audit_events** — `api/src/handlers/audit_events.ts`
- **cards** — `api/src/handlers/cards.ts`
- **linked_accounts** — `api/src/handlers/linked_accounts.ts`
- **notifications** — `api/src/handlers/notifications.ts`
- **recipients** — `api/src/handlers/recipients.ts`
- **reports** — `api/src/handlers/reports.ts`
- **statements** — `api/src/handlers/statements.ts`
- **transactions** — `api/src/handlers/transactions.ts`
- **transfers** — `api/src/handlers/transfers.ts`
- **trusted_devices** — `api/src/handlers/trusted_devices.ts`

## Screens (13)

_These pages already exist — edit the named file in place, never create a parallel one._

- **Landing** `/` → `app/src/pages/Landing.tsx`
- **Login** `/login` → `app/src/pages/Login.tsx`
- **Signup** `/signup` → `app/src/pages/Signup.tsx`
- **ForgotPassword** `/forgot-password` → `app/src/pages/ForgotPassword.tsx`
- **ResetPassword** `/reset-password` → `app/src/pages/ResetPassword.tsx`
- **Dashboard** `/dashboard` (auth) → `app/src/pages/Dashboard.tsx`
- **Accounts** `/accounts` (auth) → `app/src/pages/Accounts.tsx`
- **AccountDetail** `/accounts/:id` (auth) → `app/src/pages/AccountDetail.tsx`
- **Transfers** `/transfers` (auth) → `app/src/pages/Transfers.tsx`
- **Statements** `/statements` (auth) → `app/src/pages/Statements.tsx`
- **AuditLog** `/audit` (auth) → `app/src/pages/AuditLog.tsx`
- **Settings** `/settings` (auth) → `app/src/pages/Settings.tsx`
- **Notifications** `/notifications` (auth) → `app/src/pages/Notifications.tsx`

## Subscription tiers

free / pro / team — gated by: maxAccounts, maxCards, maxStatements, maxTransactions, maxTransfers, advancedFeatures, canExport, retentionDays

## Integrations (10 @molecule/* packages)

- **Database**: `@molecule/api-database-postgresql`
- **Domain resources**: `@molecule/api-resource-user`, `@molecule/api-resource-notification`
- **Email**: `@molecule/api-emails-mailgun`
- **Frontend / UI**: `@molecule/app-data-table`, `@molecule/app-date-range-picker`, `@molecule/app-virtual-scroll`
- **Other API**: `@molecule/api-encryption-aes`, `@molecule/api-audit-database`, `@molecule/api-reporting-database`

## Required secrets

- DATABASE_URL — PostgreSQL connection string
- ENCRYPTION_KEY — AES key for sensitive banking data
- MAILGUN_API_KEY — Mailgun API key for transaction alerts
