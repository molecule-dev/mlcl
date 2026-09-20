# Wedding Planner

- **slug**: `wedding-planner`
- **cluster**: productivity
- **type**: full-stack
- **layout**: dashboard

Zola/The-Knot-like wedding planner with guest list + RSVP collection, budget tracking, vendor checklist, and seating chart — with built-in Stripe-backed subscription tiers

> **This is a complete, working app, already built.** The data model, handlers, and screens below all exist on disk (paths shown). Treat this as the user's existing codebase: **adapt the listed files in place** for the request; do not recreate tables, handlers, or pages that already exist, and do not add packages for functionality already implemented here.

## Features

`auth`, `subscriptions`, `checklists`

## Data model (10 domain tables)

_Already created by the existing SQL in `api/migrations/` — do NOT add new migrations for these tables._

- **devices** — id, createdAt, updatedAt, userId, name, pushPlatform, pushSubscription, hasPushSubscription
- **payments** — id, createdAt, updatedAt, userId, transactionId, productId, platformKey, data, receipt
- **weddings** — id, user_id, partner_a_name, partner_b_name, wedding_date, venue, rsvp_code, plus_ones_allowed, created_at, updated_at
- **guests** — id, user_id, wedding_id, name, side, group_name, email, phone, rsvp_status, meal_choice, plus_ones, notes, …
- **rsvp_meals** — id, user_id, wedding_id, name, description, position, created_at
- **budget_items** — id, user_id, wedding_id, category, label, estimated_cents, actual_cents, vendor, notes, created_at, updated_at
- **vendors** — id, user_id, wedding_id, category, name, contact, status, notes, created_at, updated_at
- **tasks** — id, user_id, wedding_id, title, category, due_date, done, created_at, updated_at
- **tables** — id, user_id, wedding_id, name, capacity, created_at, updated_at
- **table_assignments** — id, user_id, wedding_id, table_id, guest_id, created_at

## API surface (handlers)

_These endpoints already exist — open and extend the named file, never recreate it._

- **\_seed** — `api/src/handlers/_seed.ts`
- **budget** — `api/src/handlers/budget.ts`
- **dashboard** — `api/src/handlers/dashboard.ts`
- **guests** — `api/src/handlers/guests.ts`
- **profile** — `api/src/handlers/profile.ts`
- **rsvp** — `api/src/handlers/rsvp.ts`
- **rsvp-meals** — `api/src/handlers/rsvp-meals.ts`
- **seating** — `api/src/handlers/seating.ts`
- **tasks** — `api/src/handlers/tasks.ts`
- **vendors** — `api/src/handlers/vendors.ts`
- **wedding** — `api/src/handlers/wedding.ts`

## Screens (17)

_These pages already exist — edit the named file in place, never create a parallel one._

- **Landing** `/` → `app/src/pages/Landing.tsx`
- **Login** `/login` → `app/src/pages/Login.tsx`
- **Signup** `/signup` → `app/src/pages/Signup.tsx`
- **ForgotPassword** `/forgot-password` → `app/src/pages/ForgotPassword.tsx`
- **ResetPassword** `/reset-password` → `app/src/pages/ResetPassword.tsx`
- **Rsvp** `/rsvp/:code` → `app/src/pages/Rsvp.tsx`
- **Dashboard** `/dashboard` (auth) → `app/src/pages/Dashboard.tsx`
- **Guests** `/guests` (auth) → `app/src/pages/Guests.tsx`
- **Budget** `/budget` (auth) → `app/src/pages/Budget.tsx`
- **Vendors** `/vendors` (auth) → `app/src/pages/Vendors.tsx`
- **Tasks** `/tasks` (auth) → `app/src/pages/Tasks.tsx`
- **SeatingChart** `/seating` (auth) → `app/src/pages/SeatingChart.tsx`
- **Settings** `/settings` (auth) → `app/src/pages/Settings.tsx`
- **PlanUpdated** `/plan-updated` (auth) → `app/src/pages/PlanUpdated.tsx`
- **About** `/about` → `app/src/pages/About.tsx`
- **Privacy** `/privacy` → `app/src/pages/Privacy.tsx`
- **Terms** `/terms` → `app/src/pages/Terms.tsx`

## Integrations (9 @molecule/* packages)

- **Database**: `@molecule/api-database-postgresql`
- **Domain resources**: `@molecule/api-resource-user`, `@molecule/api-resource-payment`
- **Email**: `@molecule/api-email-templates`, `@molecule/api-emails-mailgun`
- **Frontend / UI**: `@molecule/app-kpi-card-react`
- **Payments & billing**: `@molecule/api-payments-stripe`, `@molecule/api-entitlements`, `@molecule/app-billing-react`

## Required secrets

- DATABASE_URL — PostgreSQL connection string
- STRIPE_SECRET_KEY — Stripe secret API key (sk_test_... in test mode)
- STRIPE_WEBHOOK_SECRET — Stripe webhook signing secret (whsec_...)
