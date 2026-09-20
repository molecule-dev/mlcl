# Newsletter Publishing Platform

- **slug**: `newsletter`
- **cluster**: content-social
- **type**: full-stack
- **layout**: dashboard

Substack/beehiiv-like newsletter publishing with issues, subscriber management, open/click analytics, and paid tiers

> **This is a complete, working app, already built.** The data model, handlers, and screens below all exist on disk (paths shown). Treat this as the user's existing codebase: **adapt the listed files in place** for the request; do not recreate tables, handlers, or pages that already exist, and do not add packages for functionality already implemented here.

## Features

`auth`, `rss`, `scheduling`, `drafts`, `markdown`, `paid-tiers`, `open-analytics`

## Data model (6 domain tables)

_Already created by the existing SQL in `api/migrations/` — do NOT add new migrations for these tables._

- **devices** — id, createdAt, updatedAt, userId, name, pushPlatform, pushSubscription, hasPushSubscription
- **subscribers** — id, email, status, tier, source, token, subscribed_at, created_at, updated_at
- **issues** — id, author_id, user_id, subject, preview_text, body_md, status, publish_at, scheduled_at, created_at, updated_at
- **sends** — id, issue_id, subscriber_id, sent_at, opened_at, clicked_at
- **issue_stats** — id, issue_id, delivered, opened, clicked, updated_at
- **publication_settings** — id, publication_name, from_name, created_at, updated_at

## API surface (handlers)

_These endpoints already exist — open and extend the named file, never recreate it._

- **\_deliver** — `api/src/handlers/_deliver.ts`
- **\_scheduled** — `api/src/handlers/_scheduled.ts`
- **\_seed** — `api/src/handlers/_seed.ts`
- **\_seed-helpers** — `api/src/handlers/_seed-helpers.ts`
- **feed** — `api/src/handlers/feed.ts`
- **issues** — `api/src/handlers/issues.ts`
- **profile** — `api/src/handlers/profile.ts`
- **settings** — `api/src/handlers/settings.ts`
- **stats** — `api/src/handlers/stats.ts`
- **subscribers** — `api/src/handlers/subscribers.ts`

## Screens (19)

_These pages already exist — edit the named file in place, never create a parallel one._

- **About** `/about` → `app/src/pages/About.tsx`
- **Dashboard** `/dashboard` (auth) → `app/src/pages/Dashboard.tsx`
- **ForgotPassword** `/forgot-password` → `app/src/pages/ForgotPassword.tsx`
- **Help** `/help` → `app/src/pages/Help.tsx`
- **IssueDetail** `/issues/:id/detail` (auth) → `app/src/pages/IssueDetail.tsx`
- **IssueEditor** `/issues/new` (auth) → `app/src/pages/IssueEditor.tsx`
- **Issues** `/issues` (auth) → `app/src/pages/Issues.tsx`
- **Landing** `/` → `app/src/pages/Landing.tsx`
- **Login** `/login` → `app/src/pages/Login.tsx`
- **PlanUpdated** `/plan-updated` (auth) → `app/src/pages/PlanUpdated.tsx`
- **Pricing** `/pricing` → `app/src/pages/Pricing.tsx`
- **Privacy** `/privacy` → `app/src/pages/Privacy.tsx`
- **PublicIssue** `/issues/:id` → `app/src/pages/PublicIssue.tsx`
- **ResetPassword** `/reset-password` → `app/src/pages/ResetPassword.tsx`
- **Settings** `/settings` (auth) → `app/src/pages/Settings.tsx`
- **Signup** `/signup` → `app/src/pages/Signup.tsx`
- **Subscribers** `/subscribers` (auth) → `app/src/pages/Subscribers.tsx`
- **Terms** `/terms` → `app/src/pages/Terms.tsx`
- **Unsubscribe** `/unsubscribe/:token` → `app/src/pages/Unsubscribe.tsx`

## Subscription tiers

free / pro / team — gated by: maxIssues, maxSubscribers, canScheduleIssues, advancedAnalytics, paidTiers, canExport

## Integrations (9 @molecule/* packages)

- **Database**: `@molecule/api-database-postgresql`
- **Domain resources**: `@molecule/api-resource-payment`, `@molecule/api-resource-user`
- **Email**: `@molecule/api-email-templates`, `@molecule/api-emails-mailgun`
- **Frontend / UI**: `@molecule/app-shell-layout-react`
- **Payments & billing**: `@molecule/api-entitlements`, `@molecule/api-payments-stripe`, `@molecule/app-billing-react`

## Required secrets

- DATABASE_URL — PostgreSQL connection string
- STRIPE_SECRET_KEY — Stripe secret API key (sk_test_... in test mode)
- STRIPE_WEBHOOK_SECRET — Stripe webhook signing secret (whsec_...)
