# Donor Management

- **slug**: `donor-management`
- **cluster**: business-saas
- **type**: full-stack
- **layout**: admin

Kindful-like nonprofit donor CRM with donor profiles, gift history, fundraising campaigns, and year-end tax receipts — with built-in Stripe-backed subscription tiers

> **This is a complete, working app, already built.** The data model, handlers, and screens below all exist on disk (paths shown). Treat this as the user's existing codebase: **adapt the listed files in place** for the request; do not recreate tables, handlers, or pages that already exist, and do not add packages for functionality already implemented here.

## Features

`auth`, `donors`, `gifts`, `campaigns`, `tax-receipts`, `subscriptions`

## Data model (8 domain tables)

_Already created by the existing SQL in `api/migrations/` — do NOT add new migrations for these tables._

- **campaigns** — id, owner_id, name, description, goal_cents, starts_on, ends_on, status, created_at, updated_at, updatedAt
- **devices** — id, createdAt, updatedAt, userId, name, pushPlatform, pushSubscription, hasPushSubscription
- **donors** — id, owner_id, name, email, phone, address, is_organization, tags, created_at, updated_at, updatedAt
- **gifts** — id, owner_id, donor_id, amount_cents, gift_date, method, fund, campaign_id, receipt_id, note, created_at, updated_at, …
- **notes** — id, owner_id, donor_id, author, body, created_at, updatedAt
- **receipt_items** — id, receipt_id, gift_id, amount_cents, created_at, updatedAt
- **receipts** — id, owner_id, donor_id, year, receipt_number, total_cents, issued_at, created_at, updated_at, updatedAt
- **payments** — id, createdAt, updatedAt, userId, transactionId, productId, platformKey, data, receipt

## API surface (handlers)

_These endpoints already exist — open and extend the named file, never recreate it._

- **\_seed** — `api/src/handlers/_seed.ts`
- **\_shape** — `api/src/handlers/_shape.ts`
- **campaigns** — `api/src/handlers/campaigns.ts`
- **dashboard** — `api/src/handlers/dashboard.ts`
- **donors** — `api/src/handlers/donors.ts`
- **gifts** — `api/src/handlers/gifts.ts`
- **receipts** — `api/src/handlers/receipts.ts`
- **settings** — `api/src/handlers/settings.ts`

## Screens (21)

_These pages already exist — edit the named file in place, never create a parallel one._

- **Landing** `/` → `app/src/pages/Landing.tsx`
- **Login** `/login` → `app/src/pages/Login.tsx`
- **Signup** `/signup` → `app/src/pages/Signup.tsx`
- **ForgotPassword** `/forgot-password` → `app/src/pages/ForgotPassword.tsx`
- **ResetPassword** `/reset-password` → `app/src/pages/ResetPassword.tsx`
- **Dashboard** `/dashboard` (auth) → `app/src/pages/Dashboard.tsx`
- **Donors** `/donors` (auth) → `app/src/pages/Donors.tsx`
- **NewDonor** `/donors/new` (auth) → `app/src/pages/NewDonor.tsx`
- **DonorDetail** `/donors/:id` (auth) → `app/src/pages/DonorDetail.tsx`
- **Gifts** `/gifts` (auth) → `app/src/pages/Gifts.tsx`
- **NewGift** `/gifts/new` (auth) → `app/src/pages/NewGift.tsx`
- **GiftDetail** `/gifts/:id` (auth) → `app/src/pages/GiftDetail.tsx`
- **Campaigns** `/campaigns` (auth) → `app/src/pages/Campaigns.tsx`
- **Receipts** `/receipts` (auth) → `app/src/pages/Receipts.tsx`
- **ReceiptDetail** `/receipts/:id` (auth) → `app/src/pages/ReceiptDetail.tsx`
- **Settings** `/settings` (auth) → `app/src/pages/Settings.tsx`
- **PlanUpdated** `/plan-updated` (auth) → `app/src/pages/PlanUpdated.tsx`
- **Pricing** `/pricing` → `app/src/pages/Pricing.tsx`
- **About** `/about` → `app/src/pages/About.tsx`
- **Terms** `/terms` → `app/src/pages/Terms.tsx`
- **Privacy** `/privacy` → `app/src/pages/Privacy.tsx`

## Integrations (9 @molecule/* packages)

- **Database**: `@molecule/api-database-postgresql`
- **Domain resources**: `@molecule/api-resource-payment`, `@molecule/api-resource-user`
- **Email**: `@molecule/api-email-templates`, `@molecule/api-emails-mailgun`
- **Frontend / UI**: `@molecule/app-sidebar-layout-react`
- **Payments & billing**: `@molecule/api-entitlements`, `@molecule/api-payments-stripe`, `@molecule/app-billing-react`

## Required secrets

- DATABASE_URL — PostgreSQL connection string
- MAILGUN_API_KEY — Mailgun API key for auth and receipt emails
- MAILGUN_DOMAIN — Mailgun sending domain
- STRIPE_SECRET_KEY — Stripe secret API key (sk_test_... in test mode)
- STRIPE_WEBHOOK_SECRET — Stripe webhook signing secret (whsec_...)
