# Family Tree

- **slug**: `family-tree`
- **cluster**: content-social
- **type**: full-stack
- **layout**: dashboard

Ancestry-lite family tree builder with people, relationships, a navigable tree view, and per-person life timelines — with built-in Stripe-backed subscription tiers

> **This is a complete, working app, already built.** The data model, handlers, and screens below all exist on disk (paths shown). Treat this as the user's existing codebase: **adapt the listed files in place** for the request; do not recreate tables, handlers, or pages that already exist, and do not add packages for functionality already implemented here.

## Features

`auth`, `family-tree`, `people-directory`, `life-timelines`, `subscriptions`

## Data model (4 domain tables)

_Already created by the existing SQL in `api/migrations/` — do NOT add new migrations for these tables._

- **people** — id, user_id, first_name, last_name, maiden_name, gender, birth_date, birth_place, death_date, death_place, notes, photo_url, …
- **relationships** — id, user_id, from_person, to_person, kind, created_at
- **devices** — id, createdAt, updatedAt, userId, name, pushPlatform, pushSubscription, hasPushSubscription
- **payments** — id, createdAt, updatedAt, userId, transactionId, productId, platformKey, data, receipt

## API surface (handlers)

_These endpoints already exist — open and extend the named file, never recreate it._

- **\_graph** — `api/src/handlers/_graph.ts`
- **\_seed** — `api/src/handlers/_seed.ts`
- **people** — `api/src/handlers/people.ts`
- **profile** — `api/src/handlers/profile.ts`
- **tree** — `api/src/handlers/tree.ts`

## Screens (17)

_These pages already exist — edit the named file in place, never create a parallel one._

- **Landing** `/` → `app/src/pages/Landing.tsx`
- **Login** `/login` → `app/src/pages/Login.tsx`
- **Signup** `/signup` → `app/src/pages/Signup.tsx`
- **ForgotPassword** `/forgot-password` → `app/src/pages/ForgotPassword.tsx`
- **ResetPassword** `/reset-password` → `app/src/pages/ResetPassword.tsx`
- **Pricing** `/pricing` → `app/src/pages/Pricing.tsx`
- **About** `/about` → `app/src/pages/About.tsx`
- **Privacy** `/privacy` → `app/src/pages/Privacy.tsx`
- **Terms** `/terms` → `app/src/pages/Terms.tsx`
- **Tree** `/tree` (auth) → `app/src/pages/Tree.tsx`
- **People** `/people` (auth) → `app/src/pages/People.tsx`
- **PersonDetail** `/people/:id` (auth) → `app/src/pages/PersonDetail.tsx`
- **AddPerson** `/people/new` (auth) → `app/src/pages/AddPerson.tsx`
- **EditPerson** `/people/:id/edit` (auth) → `app/src/pages/EditPerson.tsx`
- **AddRelative** `/people/:id/add-relative` (auth) → `app/src/pages/AddRelative.tsx`
- **Settings** `/settings` (auth) → `app/src/pages/Settings.tsx`
- **PlanUpdated** `/plan-updated` (auth) → `app/src/pages/PlanUpdated.tsx`

## Integrations (12 @molecule/* packages)

- **Database**: `@molecule/api-database-postgresql`
- **Domain resources**: `@molecule/api-resource-user`, `@molecule/api-resource-payment`
- **Email**: `@molecule/api-emails-mailgun`, `@molecule/api-email-templates`
- **Frontend / UI**: `@molecule/app-data-table`, `@molecule/app-timeline`, `@molecule/app-command-palette`
- **Other API**: `@molecule/api-middleware-validation`
- **Payments & billing**: `@molecule/api-payments-stripe`, `@molecule/api-entitlements`, `@molecule/app-billing-react`

## Required secrets

- DATABASE_URL — PostgreSQL connection string
- STRIPE_SECRET_KEY — Stripe secret API key (sk_test_... in test mode)
- STRIPE_WEBHOOK_SECRET — Stripe webhook signing secret (whsec_...)
