# HR Management

- **slug**: `hr-management`
- **cluster**: business-saas
- **type**: full-stack
- **layout**: dashboard

BambooHR-like HR system with employee records, PTO, and org chart

> **This is a complete, working app, already built.** The data model, handlers, and screens below all exist on disk (paths shown). Treat this as the user's existing codebase: **adapt the listed files in place** for the request; do not recreate tables, handlers, or pages that already exist, and do not add packages for functionality already implemented here.

## Features

`auth`, `search`, `employees`, `pto`, `org-chart`, `documents`, `audit-log`

## Data model (13 domain tables)

_Already created by the existing SQL in `api/migrations/` — do NOT add new migrations for these tables._

- **activities** — id, actorId, action, resourceType, resourceId, metadata, createdAt
- **activity_seen_status** — userId, lastSeenActivityId, updatedAt
- **audit_events** — id, user_id, actor_id, table_name, record_id, action, before, after, occurred_at, updatedAt
- **departments** — id, user_id, name, description, parent_id, head_employee_id, created_at, updated_at, updatedAt
- **devices** — id, createdAt, updatedAt, userId, name, pushPlatform, pushSubscription, hasPushSubscription
- **documents** — id, user_id, employee_id, kind, title, category, s3_key, file_url, content_type, file_size, uploaded_by, uploaded_at, …
- **employees** — id, user_id, employee_number, first_name, last_name, work_email, personal_email, phone, start_date, end_date, employment_type, department_id, …
- **notifications** — id, user_id, kind, title, body, payload, read_at, created_at, updatedAt
- **performance_reviews** — id, user_id, employee_id, reviewer_id, cycle_id, rating, summary, status, submitted_at, created_at, updated_at, updatedAt
- **pto_balances** — id, user_id, employee_id, kind, accrued_hours, used_hours, year, policy_id, created_at, updated_at, updatedAt
- **pto_policies** — id, user_id, name, kind, accrual_rate, max_carryover_hours, effective_date, created_at, updated_at, updatedAt
- **pto_requests** — id, user_id, employee_id, kind, start_date, end_date, hours, reason, status, reviewer_id, review_note, reviewed_at, …
- **review_cycles** — id, user_id, name, start_date, end_date, status, created_at, updated_at, updatedAt

## API surface (handlers)

_These endpoints already exist — open and extend the named file, never recreate it._

- **\_decorate** — `api/src/handlers/_decorate.ts`
- **\_seed** — `api/src/handlers/_seed.ts`
- **audit** — `api/src/handlers/audit.ts`
- **dashboard** — `api/src/handlers/dashboard.ts`
- **departments** — `api/src/handlers/departments.ts`
- **documents** — `api/src/handlers/documents.ts`
- **employees** — `api/src/handlers/employees.ts`
- **notifications** — `api/src/handlers/notifications.ts`
- **onboarding** — `api/src/handlers/onboarding.ts`
- **org-tree** — `api/src/handlers/org-tree.ts`
- **performance** — `api/src/handlers/performance.ts`
- **profile** — `api/src/handlers/profile.ts`
- **pto** — `api/src/handlers/pto.ts`
- **reports** — `api/src/handlers/reports.ts`
- **reset-password** — `api/src/handlers/reset-password.ts`

## Screens (16)

_These pages already exist — edit the named file in place, never create a parallel one._

- **Login** `/login` → `app/src/pages/Login.tsx`
- **Signup** `/signup` → `app/src/pages/Signup.tsx`
- **ForgotPassword** `/forgot-password` → `app/src/pages/ForgotPassword.tsx`
- **ResetPassword** `/reset-password` → `app/src/pages/ResetPassword.tsx`
- **Dashboard** `/dashboard` (auth) → `app/src/pages/Dashboard.tsx`
- **Employees** `/employees` (auth) → `app/src/pages/Employees.tsx`
- **EmployeeProfile** `/employees/:id` (auth) → `app/src/pages/EmployeeProfile.tsx`
- **OrgChart** `/org-chart` (auth) → `app/src/pages/OrgChart.tsx`
- **PTO** `/pto` (auth) → `app/src/pages/PTO.tsx`
- **Documents** `/documents` (auth) → `app/src/pages/Documents.tsx`
- **Settings** `/settings` (auth) → `app/src/pages/Settings.tsx`
- **Notifications** `/notifications` (auth) → `app/src/pages/Notifications.tsx`
- **Onboarding** `/onboarding` (auth) → `app/src/pages/Onboarding.tsx`
- **Reports** `/reports` (auth) → `app/src/pages/Reports.tsx`
- **Performance** `/performance` (auth) → `app/src/pages/Performance.tsx`
- **AddEmployee** `/employees/new` (auth) → `app/src/pages/AddEmployee.tsx`

## Subscription tiers

free / pro / team — gated by: maxDepartments, maxDocuments, maxEmployees, maxPto, advancedFeatures, canExport, retentionDays

## Integrations (14 @molecule/* packages)

- **Auth & permissions**: `@molecule/api-permissions-custom`
- **Database**: `@molecule/api-database-postgresql`
- **Domain resources**: `@molecule/api-resource-user`, `@molecule/api-resource-activity-feed`
- **Email**: `@molecule/api-emails-mailgun`
- **Frontend / UI**: `@molecule/app-data-table`, `@molecule/app-calendar`, `@molecule/app-tree-view`, `@molecule/app-command-palette`, `@molecule/app-file-upload`
- **Other API**: `@molecule/api-audit-database`, `@molecule/api-import-export-csv`
- **Search**: `@molecule/api-search-meilisearch`
- **Uploads & media**: `@molecule/api-uploads-s3`

## Required secrets

- DATABASE_URL — PostgreSQL connection string
- MEILISEARCH_API_KEY — MeiliSearch API key
- S3_BUCKET — S3 bucket for document uploads
- MAILGUN_API_KEY — Mailgun API key
- MAILGUN_DOMAIN — Mailgun sending domain
