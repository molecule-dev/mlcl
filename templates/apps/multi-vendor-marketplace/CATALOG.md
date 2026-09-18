# Multi-vendor Marketplace

- **slug**: `multi-vendor-marketplace`
- **cluster**: ecommerce
- **type**: full-stack
- **layout**: dashboard

Etsy-like marketplace with vendor management, commissions, and payouts

> **This is a complete, working app, already built.** The data model, handlers, and screens below all exist on disk (paths shown). Treat this as the user's existing codebase: **adapt the listed files in place** for the request; do not recreate tables, handlers, or pages that already exist, and do not add packages for functionality already implemented here.

## Features

`auth`, `search`, `payments`, `notifications`, `image-upload`, `permissions`

## Data model (16 domain tables)

_Already created by the existing SQL in `api/migrations/` — do NOT add new migrations for these tables._

- **cart_items** — id, user_id, cart_id, product_id, variant_id, quantity, unit_price, name, metadata, created_at, updated_at, updatedAt
- **carts** — id, user_id, coupon, created_at, updated_at, updatedAt
- **commissions** — id, user_id, vendor_id, order_id, amount, payout_amount, status, payout_id, payout_reference, paid_at, created_at, updated_at, …
- **devices** — id, createdAt, updatedAt, userId, name, pushPlatform, pushSubscription, hasPushSubscription
- **inventory** — id, product_id, available, reserved, reason, created_at, updated_at, updatedAt
- **inventory_movements** — id, product_id, delta, reason, created_at
- **inventory_reservations** — id, product_id, user_id, quantity, expires_at, created_at
- **notifications** — id, user_id, type, payload, read_at, created_at
- **order_events** — id, order_id, status, metadata, created_at
- **order_items** — id, order_id, product_id, vendor_id, variant_id, quantity, unit_price, name, image, created_at
- **orders** — id, buyer_id, user_id, vendor_id, status, subtotal, commission, vendor_payout, tax, shipping, total, currency, …
- **payments** — id, createdAt, updatedAt, userId, transactionId, productId, platformKey, data, receipt
- **payouts** — id, vendor_id, user_id, total, currency, status, stripe_payout_id, created_at, updated_at, updatedAt
- **products** — id, vendor_id, user_id, name, slug, description, price, currency, category, sku, variants, tags, …
- **reviews** — id, user_id, product_id, vendor_id, rating, title, body, status, created_at, updated_at, updatedAt
- **vendors** — id, user_id, name, slug, description, logo, banner_url, bank_account, status, commission_rate, payout_account_id, suspension_reason, …

## API surface (handlers)

_These endpoints already exist — open and extend the named file, never recreate it._

- **\_seed** — `api/src/handlers/_seed.ts`
- **cart** — `api/src/handlers/cart.ts`
- **commissions** — `api/src/handlers/commissions.ts`
- **notifications** — `api/src/handlers/notifications.ts`
- **orders** — `api/src/handlers/orders.ts`
- **products** — `api/src/handlers/products.ts`
- **profile** — `api/src/handlers/profile.ts`
- **reviews** — `api/src/handlers/reviews.ts`
- **storefront** — `api/src/handlers/storefront.ts`
- **vendors** — `api/src/handlers/vendors.ts`

## Screens (20)

_These pages already exist — edit the named file in place, never create a parallel one._

- **Landing** `/` → `app/src/pages/Landing.tsx`
- **Login** `/login` → `app/src/pages/Login.tsx`
- **Signup** `/signup` → `app/src/pages/Signup.tsx`
- **ForgotPassword** `/forgot-password` → `app/src/pages/ForgotPassword.tsx`
- **ResetPassword** `/reset-password` → `app/src/pages/ResetPassword.tsx`
- **Catalog** `/catalog` → `app/src/pages/Catalog.tsx`
- **ProductDetail** `/products/:id` → `app/src/pages/ProductDetail.tsx`
- **VendorStorefront** `/vendors/:slug` → `app/src/pages/VendorStorefront.tsx`
- **Cart** `/cart` (auth) → `app/src/pages/Cart.tsx`
- **VendorDashboard** `/vendor/dashboard` (auth) → `app/src/pages/VendorDashboard.tsx`
- **Orders** `/orders` (auth) → `app/src/pages/Orders.tsx`
- **Settings** `/settings` (auth) → `app/src/pages/Settings.tsx`
- **Checkout** `/checkout` (auth) → `app/src/pages/Checkout.tsx`
- **OrderDetail** `/orders/:id` (auth) → `app/src/pages/OrderDetail.tsx`
- **VendorProducts** `/vendor/products` (auth) → `app/src/pages/VendorProducts.tsx`
- **VendorProductForm** `/vendor/products/new` (auth) → `app/src/pages/VendorProductForm.tsx`
- **VendorOrders** `/vendor/orders` (auth) → `app/src/pages/VendorOrders.tsx`
- **VendorPayouts** `/vendor/payouts` (auth) → `app/src/pages/VendorPayouts.tsx`
- **Notifications** `/notifications` (auth) → `app/src/pages/Notifications.tsx`
- **VendorOnboarding** `/vendor/apply` → `app/src/pages/VendorOnboarding.tsx`

## Subscription tiers

free / pro / team — gated by: maxCommissions, maxOrders, maxProducts, maxReviews, maxVendors, advancedFeatures, canExport, retentionDays

## Integrations (15 @molecule/* packages)

- **Auth & permissions**: `@molecule/api-permissions-custom`
- **Database**: `@molecule/api-database-postgresql`
- **Domain resources**: `@molecule/api-resource-user`, `@molecule/api-resource-product`, `@molecule/api-resource-cart`, `@molecule/api-resource-order`, `@molecule/api-resource-inventory`, `@molecule/api-resource-review`
- **Email**: `@molecule/api-emails-mailgun`
- **Frontend / UI**: `@molecule/app-data-table`, `@molecule/app-gallery`
- **Payments & billing**: `@molecule/api-payments-stripe`
- **Search**: `@molecule/api-search-meilisearch`
- **Uploads & media**: `@molecule/api-image-sharp`, `@molecule/api-uploads-s3`

## Required secrets

- DATABASE_URL — PostgreSQL connection string
- STRIPE_SECRET_KEY — Stripe secret API key
- STRIPE_PUBLISHABLE_KEY — Stripe publishable key
- STRIPE_WEBHOOK_SECRET — Stripe webhook signing secret
- MEILISEARCH_API_KEY — MeiliSearch admin API key
- S3_BUCKET — S3 bucket for product images
- AWS_ACCESS_KEY_ID — AWS access key for S3
- AWS_SECRET_ACCESS_KEY — AWS secret key for S3
- MAILGUN_API_KEY — Mailgun API key
- MAILGUN_DOMAIN — Mailgun sending domain
