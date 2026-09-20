# Construction Management

- **slug**: `construction-management`
- **cluster**: business-saas
- **type**: full-stack
- **layout**: dashboard

Procore-like construction project management with daily logs, punch lists, RFIs, subcontractors, and per-project photo documentation — including a built-in subscription tier (Free / Pro / Team) backed by Stripe

> **This is a complete, working app, already built.** The data model, handlers, and screens below all exist on disk (paths shown). Treat this as the user's existing codebase: **adapt the listed files in place** for the request; do not recreate tables, handlers, or pages that already exist, and do not add packages for functionality already implemented here.

## Features

`auth`, `daily-logs`, `punch-list`, `rfis`, `subcontractors`, `subscriptions`

## Data model (9 domain tables)

_Already created by the existing SQL in `api/migrations/` — do NOT add new migrations for these tables._

- **projects** — id, owner_id, code, name, description, phase, budget_cents, progress, start_date, end_date, created_at, updated_at, …
- **daily_logs** — id, owner_id, project_id, log_date, weather, crew_count, hours, notes, created_at, updated_at, updatedAt
- **log_entries** — id, log_id, area, work_performed, created_at, updatedAt
- **punch_items** — id, owner_id, project_id, location, severity, description, assignee, status, photo_url, closed_at, created_at, updated_at, …
- **rfis** — id, owner_id, project_id, number, title, question, originator, drawings_ref, due_date, status, created_at, updated_at, …
- **rfi_responses** — id, rfi_id, author, body, is_final, created_at, updatedAt
- **subcontractors** — id, owner_id, project_id, trade, company, contact, contract_value_cents, status, created_at, updated_at, updatedAt
- **devices** — id, createdAt, updatedAt, userId, name, pushPlatform, pushSubscription, hasPushSubscription
- **payments** — id, createdAt, updatedAt, userId, transactionId, productId, platformKey, data, receipt

## API surface (handlers)

_These endpoints already exist — open and extend the named file, never recreate it._

- **\_seed** — `api/src/handlers/_seed.ts`
- **\_shape** — `api/src/handlers/_shape.ts`
- **dailyLogs** — `api/src/handlers/dailyLogs.ts`
- **profile** — `api/src/handlers/profile.ts`
- **projects** — `api/src/handlers/projects.ts`
- **punchItems** — `api/src/handlers/punchItems.ts`
- **rfis** — `api/src/handlers/rfis.ts`
- **subcontractors** — `api/src/handlers/subcontractors.ts`

## Screens (19)

_These pages already exist — edit the named file in place, never create a parallel one._

- **Landing** `/` → `app/src/pages/Landing.tsx`
- **Login** `/login` → `app/src/pages/Login.tsx`
- **Signup** `/signup` → `app/src/pages/Signup.tsx`
- **ForgotPassword** `/forgot-password` → `app/src/pages/ForgotPassword.tsx`
- **ResetPassword** `/reset-password` → `app/src/pages/ResetPassword.tsx`
- **Pricing** `/pricing` → `app/src/pages/Pricing.tsx`
- **About** `/about` → `app/src/pages/About.tsx`
- **Terms** `/terms` → `app/src/pages/Terms.tsx`
- **Privacy** `/privacy` → `app/src/pages/Privacy.tsx`
- **Dashboard** `/dashboard` (auth) → `app/src/pages/Dashboard.tsx`
- **Projects** `/projects` (auth) → `app/src/pages/Projects.tsx`
- **ProjectDetail** `/projects/:projectId` (auth) → `app/src/pages/ProjectDetail.tsx`
- **DailyLogs** `/projects/:projectId/logs` (auth) → `app/src/pages/DailyLogs.tsx`
- **PunchList** `/projects/:projectId/punch` (auth) → `app/src/pages/PunchList.tsx`
- **Rfis** `/projects/:projectId/rfis` (auth) → `app/src/pages/Rfis.tsx`
- **RfiDetail** `/projects/:projectId/rfis/:rfiId` (auth) → `app/src/pages/RfiDetail.tsx`
- **Subcontractors** `/projects/:projectId/subs` (auth) → `app/src/pages/Subcontractors.tsx`
- **Settings** `/settings` (auth) → `app/src/pages/Settings.tsx`
- **PlanUpdated** `/plan-updated` (auth) → `app/src/pages/PlanUpdated.tsx`

## Subscription tiers

free / pro / team — gated by: maxProjects, maxPunchItems, maxRfis, maxSubcontractors, photoDocumentation, advancedReports, dailyLogRetentionDays, rfiWorkflow

## Integrations (8 @molecule/* packages)

- **Database**: `@molecule/api-database-postgresql`
- **Domain resources**: `@molecule/api-resource-user`
- **Email**: `@molecule/api-email-templates`, `@molecule/api-emails-mailgun`
- **Frontend / UI**: `@molecule/app-sidebar-layout-react`
- **Payments & billing**: `@molecule/api-entitlements`, `@molecule/api-payments-stripe`, `@molecule/app-billing-react`

## Required secrets

- DATABASE_URL — PostgreSQL connection string
- STRIPE_SECRET_KEY — Stripe secret API key (sk_test_... in test mode)
- STRIPE_WEBHOOK_SECRET — Stripe webhook signing secret (whsec_...)
