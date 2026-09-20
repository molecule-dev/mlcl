# Shift Scheduling

- **slug**: `shift-scheduling`
- **cluster**: business-saas
- **type**: full-stack
- **layout**: dashboard

When I Work-like shift scheduling with weekly rosters, availability windows, swap/drop approvals, open-shift claiming, and timesheet export — with built-in Stripe-backed subscription tiers

> **This is a complete, working app, already built.** The data model, handlers, and screens below all exist on disk (paths shown). Treat this as the user's existing codebase: **adapt the listed files in place** for the request; do not recreate tables, handlers, or pages that already exist, and do not add packages for functionality already implemented here.

## Features

`auth`, `schedule`, `open-shifts`, `swap-approvals`, `availability`, `staff-roster`, `timesheets`, `audit-log`, `subscriptions`

## Data model (10 domain tables)

_Already created by the existing SQL in `api/migrations/` — do NOT add new migrations for these tables._

- **activities** — id, actorId, action, resourceType, resourceId, metadata, createdAt
- **activity_seen_status** — userId, lastSeenActivityId, updatedAt
- **audit_events** — id, user_id, actor_id, table_name, record_id, action, before, after, occurred_at, updatedAt
- **availabilities** — id, user_id, staff_id, weekday, start_time, end_time, created_at, updated_at, updatedAt
- **blackout_dates** — id, user_id, staff_id, date, reason, created_at, updated_at, updatedAt
- **claims** — id, user_id, shift_id, staff_id, status, reviewed_by, reviewed_at, created_at, updated_at, updatedAt
- **devices** — id, createdAt, updatedAt, userId, name, pushPlatform, pushSubscription, hasPushSubscription
- **shifts** — id, user_id, staff_id, role, starts_at, ends_at, published, notes, assigned_via, created_at, updated_at, updatedAt
- **staff** — id, user_id, first_name, last_name, email, phone, role, max_weekly_hours, status, created_at, updated_at, updatedAt
- **swap_requests** — id, user_id, kind, from_shift, requester_staff_id, target_staff_id, status, note, reviewed_by, reviewed_at, created_at, updated_at, …

## API surface (handlers)

_These endpoints already exist — open and extend the named file, never recreate it._

- **\_decorate** — `api/src/handlers/_decorate.ts`
- **\_seed** — `api/src/handlers/_seed.ts`
- **audit** — `api/src/handlers/audit.ts`
- **availabilities** — `api/src/handlers/availabilities.ts`
- **claims** — `api/src/handlers/claims.ts`
- **dashboard** — `api/src/handlers/dashboard.ts`
- **open-shifts** — `api/src/handlers/open-shifts.ts`
- **profile** — `api/src/handlers/profile.ts`
- **reset-password** — `api/src/handlers/reset-password.ts`
- **shifts** — `api/src/handlers/shifts.ts`
- **staff** — `api/src/handlers/staff.ts`
- **swap-requests** — `api/src/handlers/swap-requests.ts`
- **timesheets** — `api/src/handlers/timesheets.ts`

## Screens (14)

_These pages already exist — edit the named file in place, never create a parallel one._

- **Login** `/login` → `app/src/pages/Login.tsx`
- **Signup** `/signup` → `app/src/pages/Signup.tsx`
- **ForgotPassword** `/forgot-password` → `app/src/pages/ForgotPassword.tsx`
- **ResetPassword** `/reset-password` → `app/src/pages/ResetPassword.tsx`
- **Landing** `/` → `app/src/pages/Landing.tsx`
- **Dashboard** `/dashboard` (auth) → `app/src/pages/Dashboard.tsx`
- **Schedule** `/schedule` (auth) → `app/src/pages/Schedule.tsx`
- **ShiftDetail** `/shifts/:id` (auth) → `app/src/pages/ShiftDetail.tsx`
- **OpenShifts** `/open-shifts` (auth) → `app/src/pages/OpenShifts.tsx`
- **SwapRequests** `/swap-requests` (auth) → `app/src/pages/SwapRequests.tsx`
- **Availability** `/availability` (auth) → `app/src/pages/Availability.tsx`
- **Staff** `/staff` (auth) → `app/src/pages/Staff.tsx`
- **Timesheets** `/timesheets` (auth) → `app/src/pages/Timesheets.tsx`
- **Settings** `/settings` (auth) → `app/src/pages/Settings.tsx`

## Subscription tiers

free / pro / team — gated by: maxStaff, maxWeeklyShifts, advancedFeatures, canExport, retentionDays

## Integrations (12 @molecule/* packages)

- **Auth & permissions**: `@molecule/api-permissions-custom`
- **Database**: `@molecule/api-database-postgresql`
- **Domain resources**: `@molecule/api-resource-user`, `@molecule/api-resource-payment`
- **Email**: `@molecule/api-emails-mailgun`, `@molecule/api-email-templates`
- **Frontend / UI**: `@molecule/app-command-palette`, `@molecule/app-kpi-card-react`
- **Other API**: `@molecule/api-audit-database`
- **Payments & billing**: `@molecule/api-payments-stripe`, `@molecule/api-entitlements`, `@molecule/app-billing-react`

## Required secrets

- DATABASE_URL — PostgreSQL connection string
- MAILGUN_API_KEY — Mailgun API key
- MAILGUN_DOMAIN — Mailgun sending domain
- STRIPE_SECRET_KEY — Stripe secret API key (sk_test_... in test mode)
- STRIPE_WEBHOOK_SECRET — Stripe webhook signing secret (whsec_...)
