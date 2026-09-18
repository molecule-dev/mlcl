# Budget Planner

- **slug**: `budget-planner`
- **cluster**: finance
- **type**: full-stack
- **layout**: dashboard

YNAB-like envelope budgeting with categories, assignments, spending reports, and goal tracking

> **This is a complete, working app, already built.** The data model, handlers, and screens below all exist on disk (paths shown). Treat this as the user's existing codebase: **adapt the listed files in place** for the request; do not recreate tables, handlers, or pages that already exist, and do not add packages for functionality already implemented here.

## Features

`auth`, `import-export`, `reports`

## Data model (8 domain tables)

_Already created by the existing SQL in `api/migrations/` — do NOT add new migrations for these tables._

- **budget_accounts** — id, user_id, name, type, institution, mask, balance, on_budget, closed, created_at, updatedAt
- **budget_categories** — id, user_id, name, group_name, sort_order, archived, created_at, updatedAt
- **budget_transactions** — id, user_id, account_id, category_id, payee, amount, type, date, memo, cleared, created_at, updatedAt
- **devices** — id, createdAt, updatedAt, userId, name, pushPlatform, pushSubscription, hasPushSubscription
- **envelopes** — id, user_id, category_id, month, year, assigned, activity, created_at, updatedAt
- **goals** — id, user_id, category_id, name, target_amount, saved_amount, monthly_contribution, target_date, status, icon, color, created_at, …
- **payments** — id, createdAt, updatedAt, userId, transactionId, productId, platformKey, data, receipt
- **budget_notifications** — id, user_id, type, title, body, href, unread, created_at, updatedAt

## API surface (handlers)

_These endpoints already exist — open and extend the named file, never recreate it._

- **accounts** — `api/src/handlers/accounts.ts`
- **categories** — `api/src/handlers/categories.ts`
- **envelopes** — `api/src/handlers/envelopes.ts`
- **goals** — `api/src/handlers/goals.ts`
- **import_export** — `api/src/handlers/import_export.ts`
- **notifications** — `api/src/handlers/notifications.ts`
- **payments** — `api/src/handlers/payments.ts`
- **profile** — `api/src/handlers/profile.ts`
- **reports** — `api/src/handlers/reports.ts`
- **transactions** — `api/src/handlers/transactions.ts`

## Screens (20)

_These pages already exist — edit the named file in place, never create a parallel one._

- **Landing** `/` → `app/src/pages/Landing.tsx`
- **Login** `/login` → `app/src/pages/Login.tsx`
- **Signup** `/signup` → `app/src/pages/Signup.tsx`
- **ForgotPassword** `/forgot-password` → `app/src/pages/ForgotPassword.tsx`
- **ResetPassword** `/reset-password` → `app/src/pages/ResetPassword.tsx`
- **Budget** `/budget` (auth) → `app/src/pages/Budget.tsx`
- **Accounts** `/accounts` (auth) → `app/src/pages/Accounts.tsx`
- **Transactions** `/transactions` (auth) → `app/src/pages/Transactions.tsx`
- **Goals** `/goals` (auth) → `app/src/pages/Goals.tsx`
- **Reports** `/reports` (auth) → `app/src/pages/Reports.tsx`
- **Settings** `/settings` (auth) → `app/src/pages/Settings.tsx`
- **Dashboard** `/dashboard` (auth) → `app/src/pages/Dashboard.tsx`
- **AccountDetail** `/accounts/:id` (auth) → `app/src/pages/AccountDetail.tsx`
- **TransactionDetail** `/transactions/:id` (auth) → `app/src/pages/TransactionDetail.tsx`
- **GoalDetail** `/goals/:id` (auth) → `app/src/pages/GoalDetail.tsx`
- **Categories** `/categories` (auth) → `app/src/pages/Categories.tsx`
- **AddTransaction** `/transactions/new` (auth) → `app/src/pages/AddTransaction.tsx`
- **ImportTransactions** `/import` (auth) → `app/src/pages/ImportTransactions.tsx`
- **Profile** `/settings/profile` (auth) → `app/src/pages/Profile.tsx`
- **Billing** `/settings/billing` (auth) → `app/src/pages/Billing.tsx`

## Subscription tiers

free / pro / team — gated by: maxAccounts, maxCategories, maxEnvelopes, maxTransactions, advancedFeatures, canExport, retentionDays

## Integrations (8 @molecule/* packages)

- **Database**: `@molecule/api-database-postgresql`
- **Domain resources**: `@molecule/api-resource-user`
- **Frontend / UI**: `@molecule/app-data-table`, `@molecule/app-date-range-picker`, `@molecule/app-virtual-scroll`
- **Other API**: `@molecule/api-reporting-database`, `@molecule/api-import-export-csv`, `@molecule/api-cron-node-cron`

## Required secrets

- DATABASE_URL — PostgreSQL connection string
