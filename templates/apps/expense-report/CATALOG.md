# Expense Report

- **slug**: `expense-report`
- **cluster**: finance
- **type**: full-stack
- **layout**: dashboard

Expensify-like expense management with receipts, approval workflow, policies, and reimbursement tracking

> **This is a complete, working app, already built.** The data model, handlers, and screens below all exist on disk (paths shown). Treat this as the user's existing codebase: **adapt the listed files in place** for the request; do not recreate tables, handlers, or pages that already exist, and do not add packages for functionality already implemented here.

## Features

`auth`, `file-upload`, `workflow`, `reports`, `import-export`

## Data model (7 domain tables)

_Already created by the existing SQL in `api/migrations/` — do NOT add new migrations for these tables._

- **devices** — id, createdAt, updatedAt, userId, name, pushPlatform, pushSubscription, hasPushSubscription
- **expense_policies** — id, user_id, name, description, max_amount, categories, requires_receipt_above, auto_approve_below, is_active, created_at, updatedAt
- **expense_reports** — id, user_id, submitter_email, approver_id, approver_email, policy_id, title, description, total_amount, currency, status, submitted_at, …
- **expenses** — id, user_id, report_id, amount, currency, category, date, description, merchant, receipt_url, status, policy_violation, …
- **notifications** — id, user_id, type, title, message, report_id, actor, read, created_at
- **payments** — id, createdAt, updatedAt, userId, transactionId, productId, platformKey, data, receipt
- **user_preferences** — user_id, payout_method, notify_submitted, notify_reviewed, notify_reimbursed, notify_policy, created_at, updated_at

## API surface (handlers)

_These endpoints already exist — open and extend the named file, never recreate it._

- **\_policy** — `api/src/handlers/_policy.ts`
- **\_seed** — `api/src/handlers/_seed.ts`
- **approvals** — `api/src/handlers/approvals.ts`
- **dashboard** — `api/src/handlers/dashboard.ts`
- **expenses** — `api/src/handlers/expenses.ts`
- **notifications** — `api/src/handlers/notifications.ts`
- **policies** — `api/src/handlers/policies.ts`
- **preferences** — `api/src/handlers/preferences.ts`
- **receipts** — `api/src/handlers/receipts.ts`
- **reports** — `api/src/handlers/reports.ts`

## Screens (13)

_These pages already exist — edit the named file in place, never create a parallel one._

- **Login** `/login` → `app/src/pages/Login.tsx`
- **Signup** `/signup` → `app/src/pages/Signup.tsx`
- **ForgotPassword** `/forgot-password` → `app/src/pages/ForgotPassword.tsx`
- **ResetPassword** `/reset-password` → `app/src/pages/ResetPassword.tsx`
- **Dashboard** `/dashboard` (auth) → `app/src/pages/Dashboard.tsx`
- **Expenses** `/expenses` (auth) → `app/src/pages/Expenses.tsx`
- **NewExpense** `/expenses/new` (auth) → `app/src/pages/NewExpense.tsx`
- **Reports** `/reports` (auth) → `app/src/pages/Reports.tsx`
- **Approvals** `/approvals` (auth) → `app/src/pages/Approvals.tsx`
- **Settings** `/settings` (auth) → `app/src/pages/Settings.tsx`
- **ReportsList** `/reports/list` (auth) → `app/src/pages/ReportsList.tsx`
- **NewReport** `/reports/new` (auth) → `app/src/pages/NewReport.tsx`
- **Notifications** `/notifications` (auth) → `app/src/pages/Notifications.tsx`

## Subscription tiers

free / pro / team — gated by: maxApprovals, maxExpenses, maxPolicies, maxReceipts, advancedFeatures, canExport, retentionDays

## Integrations (12 @molecule/* packages)

- **Auth & permissions**: `@molecule/api-permissions-custom`
- **Database**: `@molecule/api-database-postgresql`
- **Domain resources**: `@molecule/api-resource-user`
- **Email**: `@molecule/api-emails-mailgun`
- **Frontend / UI**: `@molecule/app-data-table`, `@molecule/app-file-upload`, `@molecule/app-date-range-picker`
- **Other API**: `@molecule/api-workflow-database`, `@molecule/api-reporting-database`, `@molecule/api-import-export-csv`
- **Uploads & media**: `@molecule/api-uploads-s3`, `@molecule/api-image-sharp`

## Required secrets

- DATABASE_URL — PostgreSQL connection string
- S3_BUCKET — S3 bucket for receipt uploads
- MAILGUN_API_KEY — Mailgun API key for approval notifications
