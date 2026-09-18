# Subscription Box

- **slug**: `subscription-box`
- **cluster**: ecommerce
- **type**: full-stack
- **layout**: dashboard

Cratejoy-like recurring subscription boxes with billing, customization, and shipment tracking

> **This is a complete, working app, already built.** The data model, handlers, and screens below all exist on disk (paths shown). Treat this as the user's existing codebase: **adapt the listed files in place** for the request; do not recreate tables, handlers, or pages that already exist, and do not add packages for functionality already implemented here.

## Features

`auth`, `payments`, `notifications`, `image-upload`

## Data model (13 domain tables)

_Already created by the existing SQL in `api/migrations/` — do NOT add new migrations for these tables._

- **box_items** — id, box_id, product_id, product_variant_id, name, quantity, is_custom, created_at, updatedAt
- **boxes** — id, user_id, subscription_id, theme, billing_period, scheduled_for, status, customizations, items, created_at, updated_at, updatedAt
- **devices** — id, createdAt, updatedAt, userId, name, pushPlatform, pushSubscription, hasPushSubscription
- **invoices** — id, user_id, subscription_id, stripe_invoice_id, amount_due, amount_paid, currency, status, hosted_invoice_url, invoice_pdf, period_start, period_end, …
- **order_events** — id, orderId, status, metadata, createdAt
- **order_items** — id, orderId, productId, variantId, name, price, quantity, image
- **orders** — id, userId, status, subtotal, tax, shipping, discount, total, shippingAddress, billingAddress, paymentId, notes, …
- **payments** — id, createdAt, updatedAt, userId, transactionId, productId, platformKey, data, receipt
- **product_variants** — id, productId, name, sku, price, inventory, createdAt, updatedAt
- **products** — id, name, slug, description, price, currency, status, imageUrl, sku, inventory, createdAt, updatedAt, …
- **shipments** — id, box_id, user_id, carrier, tracking_number, label_url, estimated_delivery, status, shipped_at, delivered_at, created_at, updated_at, …
- **subscription_plans** — id, name, slug, description, price, currency, interval, interval_count, features, included_items, max_customizations, stripe_price_id, …
- **subscriptions** — id, user_id, plan_id, status, payment_subscription_id, stripe_subscription_id, preferences, current_period_start, current_period_end, next_billing_date, paused_at, cancelled_at, …

## API surface (handlers)

_These endpoints already exist — open and extend the named file, never recreate it._

- **\_async** — `api/src/handlers/_async.ts`
- **\_seed** — `api/src/handlers/_seed.ts`
- **\_test** — `api/src/handlers/_test.ts`
- **boxes** — `api/src/handlers/boxes.ts`
- **plans** — `api/src/handlers/plans.ts`
- **shipments** — `api/src/handlers/shipments.ts`
- **subscriptions** — `api/src/handlers/subscriptions.ts`

## Screens (12)

_These pages already exist — edit the named file in place, never create a parallel one._

- **Landing** `/` → `app/src/pages/Landing.tsx`
- **Login** `/login` → `app/src/pages/Login.tsx`
- **Signup** `/signup` → `app/src/pages/Signup.tsx`
- **ForgotPassword** `/forgot-password` → `app/src/pages/ForgotPassword.tsx`
- **ResetPassword** `/reset-password` → `app/src/pages/ResetPassword.tsx`
- **Dashboard** `/dashboard` (auth) → `app/src/pages/Dashboard.tsx`
- **Boxes** `/boxes` (auth) → `app/src/pages/Boxes.tsx`
- **Customize** `/customize` (auth) → `app/src/pages/Customize.tsx`
- **Shipments** `/shipments` (auth) → `app/src/pages/Shipments.tsx`
- **BoxDetail** `/boxes/:id` (auth) → `app/src/pages/BoxDetail.tsx`
- **Billing** `/billing` (auth) → `app/src/pages/Billing.tsx`
- **Settings** `/settings` (auth) → `app/src/pages/Settings.tsx`

## Subscription tiers

free / pro / team — gated by: maxBoxes, maxPlans, maxShipments, maxSubscriptions, advancedFeatures, canExport, retentionDays

## Integrations (12 @molecule/* packages)

- **Database**: `@molecule/api-database-postgresql`
- **Domain resources**: `@molecule/api-resource-user`, `@molecule/api-resource-product`, `@molecule/api-resource-order`
- **Email**: `@molecule/api-emails-mailgun`
- **Frontend / UI**: `@molecule/app-data-table`, `@molecule/app-gallery`, `@molecule/app-stepper`
- **Other API**: `@molecule/api-cron-node-cron`
- **Payments & billing**: `@molecule/api-payments-stripe`
- **Uploads & media**: `@molecule/api-image-sharp`, `@molecule/api-uploads-s3`

## Required secrets

- DATABASE_URL — PostgreSQL connection string
- STRIPE_SECRET_KEY — Stripe secret key
- STRIPE_PUBLISHABLE_KEY — Stripe publishable key
- STRIPE_WEBHOOK_SECRET — Stripe webhook signing secret
- S3_BUCKET — S3 bucket for box images
- AWS_ACCESS_KEY_ID — AWS access key
- AWS_SECRET_ACCESS_KEY — AWS secret key
- MAILGUN_API_KEY — Mailgun API key
- MAILGUN_DOMAIN — Mailgun domain
