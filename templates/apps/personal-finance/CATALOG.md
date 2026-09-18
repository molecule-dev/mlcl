# Personal Finance Tracker

- **slug**: `personal-finance`
- **cluster**: finance
- **type**: full-stack
- **layout**: dashboard

Mint-like finance tracking with accounts, transactions, budgets, and savings goals

> **This is a complete, working app, already built.** The data model, handlers, and screens below all exist on disk (paths shown). Treat this as the user's existing codebase: **adapt the listed files in place** for the request; do not recreate tables, handlers, or pages that already exist, and do not add packages for functionality already implemented here.

## Features

`auth`, `import-export`, `reports`, `ai-classification`

## Data model (6 domain tables)

_Already created by the existing SQL in `api/migrations/` — do NOT add new migrations for these tables._

- **accounts** — id, user_id, name, type, institution, account_number_encrypted, currency, balance, created_at, updatedAt
- **budgets** — id, user_id, category_id, name, amount, period, start_date, end_date, created_at, updatedAt, month, year
- **categories** — id, user_id, name, type, color, icon, created_at, parent_id
- **devices** — id, createdAt, updatedAt, userId, name, pushPlatform, pushSubscription, hasPushSubscription
- **goals** — id, user_id, name, target_amount, current_amount, deadline, account_id, created_at, updatedAt, target_date, icon, color, …
- **transactions** — id, user_id, account_id, amount, type, description, date, category_id, notes, created_at, updatedAt, recurring, …

## API surface (handlers)

_These endpoints already exist — open and extend the named file, never recreate it._

- **accounts** — `api/src/handlers/accounts.ts`
- **budgets** — `api/src/handlers/budgets.ts`
- **categories** — `api/src/handlers/categories.ts`
- **data-export** — `api/src/handlers/data-export.ts`
- **goals** — `api/src/handlers/goals.ts`
- **notifications** — `api/src/handlers/notifications.ts`
- **reports** — `api/src/handlers/reports.ts`
- **transactions** — `api/src/handlers/transactions.ts`

## Screens (15)

_These pages already exist — edit the named file in place, never create a parallel one._

- **Dashboard** `/` (auth) → `app/src/pages/Dashboard.tsx`
- **Transactions** `/transactions` (auth) → `app/src/pages/Transactions.tsx`
- **Accounts** `/accounts` (auth) → `app/src/pages/Accounts.tsx`
- **Budgets** `/budgets` (auth) → `app/src/pages/Budgets.tsx`
- **Goals** `/goals` (auth) → `app/src/pages/Goals.tsx`
- **Reports** `/reports` (auth) → `app/src/pages/Reports.tsx`
- **Login** `/login` → `app/src/pages/Login.tsx`
- **Settings** `/settings` (auth) → `app/src/pages/Settings.tsx`
- **AddTransaction** `/transactions/new` (auth) → `app/src/pages/AddTransaction.tsx`
- **TransactionDetail** `/transactions/:id` (auth) → `app/src/pages/TransactionDetail.tsx`
- **AccountDetail** `/accounts/:id` (auth) → `app/src/pages/AccountDetail.tsx`
- **Categories** `/categories` (auth) → `app/src/pages/Categories.tsx`
- **Signup** `/signup` → `app/src/pages/Signup.tsx`
- **ForgotPassword** `/forgot-password` → `app/src/pages/ForgotPassword.tsx`
- **ResetPassword** `/reset-password` → `app/src/pages/ResetPassword.tsx`

## Subscription tiers

free / pro / team — gated by: maxAccounts, maxTransactionsPerMonth, maxBudgets, maxGoals, canImport, canExport, aiCategorization, advancedReports, maxCurrencies, retentionDays

## Integrations (10 @molecule/* packages)

- **AI**: `@molecule/api-ai-classification`
- **Database**: `@molecule/api-database-postgresql`
- **Domain resources**: `@molecule/api-resource-user`
- **Frontend / UI**: `@molecule/app-data-table`, `@molecule/app-date-range-picker`, `@molecule/app-virtual-scroll`
- **Other API**: `@molecule/api-encryption-aes`, `@molecule/api-import-export-csv`, `@molecule/api-reporting-database`, `@molecule/api-cron-node-cron`

## Required secrets

- DATABASE_URL — PostgreSQL connection string
- ENCRYPTION_KEY — AES encryption key for sensitive financial data
