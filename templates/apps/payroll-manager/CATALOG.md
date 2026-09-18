# Payroll Manager

- **slug**: `payroll-manager`
- **cluster**: finance
- **type**: full-stack
- **layout**: dashboard

Gusto-like payroll management with employees, pay runs, tax calculations, and compliance reports

> **This is a complete, working app, already built.** The data model, handlers, and screens below all exist on disk (paths shown). Treat this as the user's existing codebase: **adapt the listed files in place** for the request; do not recreate tables, handlers, or pages that already exist, and do not add packages for functionality already implemented here.

## Features

`auth`, `permissions`, `audit-log`, `reports`, `import-export`

## Data model (11 domain tables)

_Already created by the existing SQL in `api/migrations/` — do NOT add new migrations for these tables._

- **employees** — id, user_id, first_name, last_name, email, title, department, salary, pay_frequency, tax_filing_status, ssn_encrypted, start_date, …
- **pay_runs** — id, user_id, pay_period_start, pay_period_end, pay_date, employee_count, total_gross, total_taxes, total_deductions, total_net, status, approved_by, …
- **pay_stubs** — id, user_id, pay_run_id, employee_id, employee_name, gross, federal_tax, state_tax, fica, medicare, deductions_total, net, …
- **deductions** — id, user_id, employee_id, name, type, amount, is_percentage, is_pretax, is_active, created_at, updatedAt
- **tax_brackets** — id, year, filing_status, min_income, max_income, rate, created_at
- **tax_withholdings** — id, user_id, employee_id, federal_allowances, state_allowances, additional_withholding, exempt, created_at, updatedAt
- **audit_log** — id, actor, action, resource, resource_id, details, ip, user_agent, timestamp
- **payments** — id, createdAt, updatedAt, userId, transactionId, productId, platformKey, data, receipt
- **notifications** — id, user_id, category, title, body, href, unread, created_at
- **company_settings** — id, user_id, legal_name, ein, address, fiscal_year, cadence, cycle_end_day, pay_date_offset, holiday_behavior, created_at, updatedAt
- **devices** — id, createdAt, updatedAt, userId, name, pushPlatform, pushSubscription, hasPushSubscription

## API surface (handlers)

_These endpoints already exist — open and extend the named file, never recreate it._

- **\_seed** — `api/src/handlers/_seed.ts`
- **audit-log** — `api/src/handlers/audit-log.ts`
- **company-settings** — `api/src/handlers/company-settings.ts`
- **deductions** — `api/src/handlers/deductions.ts`
- **employees** — `api/src/handlers/employees.ts`
- **notifications** — `api/src/handlers/notifications.ts`
- **pay-runs** — `api/src/handlers/pay-runs.ts`
- **pay-stubs** — `api/src/handlers/pay-stubs.ts`
- **reports** — `api/src/handlers/reports.ts`
- **taxes** — `api/src/handlers/taxes.ts`
- **users-2fa** — `api/src/handlers/users-2fa.ts`

## Screens (19)

_These pages already exist — edit the named file in place, never create a parallel one._

- **Landing** `/` → `app/src/pages/Landing.tsx`
- **Login** `/login` → `app/src/pages/Login.tsx`
- **Signup** `/signup` → `app/src/pages/Signup.tsx`
- **ForgotPassword** `/forgot-password` → `app/src/pages/ForgotPassword.tsx`
- **ResetPassword** `/reset-password` → `app/src/pages/ResetPassword.tsx`
- **Dashboard** `/dashboard` (auth) → `app/src/pages/Dashboard.tsx`
- **Employees** `/employees` (auth) → `app/src/pages/Employees.tsx`
- **EmployeeDetail** `/employees/:id` (auth) → `app/src/pages/EmployeeDetail.tsx`
- **PayRuns** `/pay-runs` (auth) → `app/src/pages/PayRuns.tsx`
- **RunPayroll** `/run-payroll` (auth) → `app/src/pages/RunPayroll.tsx`
- **PayStub** `/pay-stub/:id` (auth) → `app/src/pages/PayStub.tsx`
- **TaxCenter** `/taxes` (auth) → `app/src/pages/TaxCenter.tsx`
- **Reports** `/reports` (auth) → `app/src/pages/Reports.tsx`
- **Settings** `/settings` (auth) → `app/src/pages/Settings.tsx`
- **PayRunDetail** `/pay-runs/:id` (auth) → `app/src/pages/PayRunDetail.tsx`
- **AuditLog** `/audit-log` (auth) → `app/src/pages/AuditLog.tsx`
- **Notifications** `/notifications` (auth) → `app/src/pages/Notifications.tsx`
- **Billing** `/settings/billing` (auth) → `app/src/pages/Billing.tsx`
- **Profile** `/profile` (auth) → `app/src/pages/Profile.tsx`

## Subscription tiers

free / pro / team — gated by: maxDeductions, maxEmployees, maxPayRuns, maxTaxes, advancedFeatures, canExport, retentionDays

## Integrations (12 @molecule/* packages)

- **Auth & permissions**: `@molecule/api-permissions-custom`
- **Database**: `@molecule/api-database-postgresql`
- **Domain resources**: `@molecule/api-resource-user`
- **Email**: `@molecule/api-emails-mailgun`
- **Frontend / UI**: `@molecule/app-data-table`, `@molecule/app-date-range-picker`, `@molecule/app-virtual-scroll`
- **Other API**: `@molecule/api-encryption-aes`, `@molecule/api-cron-node-cron`, `@molecule/api-reporting-database`, `@molecule/api-audit-database`, `@molecule/api-import-export-csv`

## Required secrets

- DATABASE_URL — PostgreSQL connection string
- ENCRYPTION_KEY — AES key for encrypting SSN/tax data
- MAILGUN_API_KEY — Mailgun API key for pay stub emails
