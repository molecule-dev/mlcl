# Civic 311

- **slug**: `civic-311`
- **cluster**: community-civic
- **type**: full-stack
- **layout**: dashboard

SeeClickFix-like civic issue reporter with photo + map pin, status workflow, duplicate detection, and watch areas — including a built-in subscription tier (Free / Pro / Team) backed by Stripe

> **This is a complete, working app, already built.** The data model, handlers, and screens below all exist on disk (paths shown). Treat this as the user's existing codebase: **adapt the listed files in place** for the request; do not recreate tables, handlers, or pages that already exist, and do not add packages for functionality already implemented here.

## Features

`auth`, `issue-reporting`, `photo-uploads`, `map-pins`, `status-workflow`, `duplicate-detection`, `confirmations`, `watch-areas`, `notifications`, `subscriptions`

## Data model (6 domain tables)

_Already created by the existing SQL in `api/migrations/` — do NOT add new migrations for these tables._

- **devices** — id, createdAt, updatedAt, userId, name, pushPlatform, pushSubscription, hasPushSubscription
- **issues** — id, reporter_id, category, description, status, photo_url, x, y, derived_address, official_note, created_at, updated_at, …
- **issue_events** — id, issue_id, kind, actor_id, text, from_status, to_status, created_at
- **confirmations** — id, issue_id, user_id, created_at
- **watch_areas** — id, user_id, name, x, y, radius, created_at
- **notifications** — id, user_id, kind, issue_id, message, read_at, created_at

## API surface (handlers)

_These endpoints already exist — open and extend the named file, never recreate it._

- **\_seed** — `api/src/handlers/_seed.ts`
- **\_test** — `api/src/handlers/_test.ts`
- **issues** — `api/src/handlers/issues.ts`
- **notifications** — `api/src/handlers/notifications.ts`
- **photos** — `api/src/handlers/photos.ts`
- **users-me** — `api/src/handlers/users-me.ts`
- **watch-areas** — `api/src/handlers/watch-areas.ts`

## Screens (16)

_These pages already exist — edit the named file in place, never create a parallel one._

- **Landing** `/` → `app/src/pages/Landing.tsx`
- **Login** `/login` → `app/src/pages/Login.tsx`
- **Signup** `/signup` → `app/src/pages/Signup.tsx`
- **ForgotPassword** `/forgot-password` → `app/src/pages/ForgotPassword.tsx`
- **ResetPassword** `/reset-password` → `app/src/pages/ResetPassword.tsx`
- **Explore** `/explore` (auth) → `app/src/pages/Explore.tsx`
- **ReportIssue** `/report` (auth) → `app/src/pages/ReportIssue.tsx`
- **MyReports** `/my-reports` (auth) → `app/src/pages/MyReports.tsx`
- **ReportDetail** `/reports/:id` (auth) → `app/src/pages/ReportDetail.tsx`
- **WatchAreas** `/watch-areas` (auth) → `app/src/pages/WatchAreas.tsx`
- **Notifications** `/notifications` (auth) → `app/src/pages/Notifications.tsx`
- **Settings** `/settings` (auth) → `app/src/pages/Settings.tsx`
- **Pricing** `/pricing` → `app/src/pages/Pricing.tsx`
- **About** `/about` → `app/src/pages/About.tsx`
- **Terms** `/terms` → `app/src/pages/Terms.tsx`
- **Privacy** `/privacy` → `app/src/pages/Privacy.tsx`

## Subscription tiers

free / pro / team — gated by: maxOpenIssues, maxWatchAreas, photoAttachments, duplicateDetection, watchAreaAlerts, exportHistory

## Integrations (11 @molecule/* packages)

- **Database**: `@molecule/api-database-postgresql`
- **Domain resources**: `@molecule/api-resource-user`, `@molecule/api-resource-payment`
- **Email**: `@molecule/api-email-templates`, `@molecule/api-emails-mailgun`
- **Frontend / UI**: `@molecule/app-shell-layout-react`
- **Payments & billing**: `@molecule/api-payments-stripe`, `@molecule/api-entitlements`, `@molecule/app-billing-react`
- **Uploads & media**: `@molecule/api-uploads`, `@molecule/api-uploads-s3`

## Required secrets

- DATABASE_URL — PostgreSQL connection string
- STRIPE_SECRET_KEY — Stripe secret API key (sk_test_... in test mode)
- STRIPE_WEBHOOK_SECRET — Stripe webhook signing secret (whsec_...)
