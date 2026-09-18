# Digital Goods Store

- **slug**: `digital-goods-store`
- **cluster**: ecommerce
- **type**: full-stack
- **layout**: dashboard

Gumroad-like digital downloads with license keys, download links, and analytics

> **This is a complete, working app, already built.** The data model, handlers, and screens below all exist on disk (paths shown). Treat this as the user's existing codebase: **adapt the listed files in place** for the request; do not recreate tables, handlers, or pages that already exist, and do not add packages for functionality already implemented here.

## Features

`auth`, `search`, `payments`, `notifications`, `file-upload`

## Data model (11 domain tables)

_Already created by the existing SQL in `api/migrations/` — do NOT add new migrations for these tables._

- **carts** — id, user_id, items, coupon_code, created_at, updated_at
- **devices** — id, createdAt, updatedAt, userId, name, pushPlatform, pushSubscription, hasPushSubscription
- **download_logs** — id, user_id, product_id, license_id, ip_address, user_agent, signed_url, expires_at, created_at
- **licenses** — id, purchase_id, product_id, user_id, license_key, status, activations, max_activations, last_activated_at, last_device_id, revoked_at, revoke_reason, …
- **order_events** — id, orderId, status, metadata, createdAt
- **order_items** — id, orderId, productId, variantId, name, price, quantity, image
- **orders** — id, userId, status, subtotal, tax, shipping, discount, total, shippingAddress, billingAddress, paymentId, notes, …
- **payments** — id, createdAt, updatedAt, userId, transactionId, productId, platformKey, data, receipt
- **product_variants** — id, productId, name, sku, price, inventory, createdAt, updatedAt
- **products** — id, name, slug, description, price, currency, status, imageUrl, sku, inventory, createdAt, updatedAt, …
- **purchases** — id, user_id, product_id, amount, currency, status, payment_id, refunded_at, created_at

## API surface (handlers)

_These endpoints already exist — open and extend the named file, never recreate it._

- **analytics** — `api/src/handlers/analytics.ts`
- **checkout** — `api/src/handlers/checkout.ts`
- **downloads** — `api/src/handlers/downloads.ts`
- **library** — `api/src/handlers/library.ts`
- **licenses** — `api/src/handlers/licenses.ts`
- **orders** — `api/src/handlers/orders.ts`
- **products** — `api/src/handlers/products.ts`
- **profile** — `api/src/handlers/profile.ts`
- **purchases** — `api/src/handlers/purchases.ts`
- **sales** — `api/src/handlers/sales.ts`

## Screens (17)

_These pages already exist — edit the named file in place, never create a parallel one._

- **Landing** `/` → `app/src/pages/Landing.tsx`
- **Storefront** `/shop` → `app/src/pages/Storefront.tsx`
- **ProductDetail** `/shop/:slug` → `app/src/pages/ProductDetail.tsx`
- **Login** `/login` → `app/src/pages/Login.tsx`
- **Signup** `/signup` → `app/src/pages/Signup.tsx`
- **ForgotPassword** `/forgot-password` → `app/src/pages/ForgotPassword.tsx`
- **ResetPassword** `/reset-password` → `app/src/pages/ResetPassword.tsx`
- **Dashboard** `/dashboard` (auth) → `app/src/pages/Dashboard.tsx`
- **Products** `/products` (auth) → `app/src/pages/Products.tsx`
- **Sales** `/sales` (auth) → `app/src/pages/Sales.tsx`
- **Settings** `/settings` (auth) → `app/src/pages/Settings.tsx`
- **Cart** `/cart` → `app/src/pages/Cart.tsx`
- **Checkout** `/checkout` → `app/src/pages/Checkout.tsx`
- **OrderConfirm** `/order/:id/confirm` → `app/src/pages/OrderConfirm.tsx`
- **CustomerLibrary** `/library` (auth) → `app/src/pages/CustomerLibrary.tsx`
- **OrderHistory** `/orders` (auth) → `app/src/pages/OrderHistory.tsx`
- **ProductEditor** `/products/:id/edit` (auth) → `app/src/pages/ProductEditor.tsx`

## Subscription tiers

free / pro / team — gated by: maxAnalytics, maxDownloads, maxLicenses, maxProducts, maxPurchases, advancedFeatures, canExport, retentionDays

## Integrations (13 @molecule/* packages)

- **Database**: `@molecule/api-database-postgresql`
- **Domain resources**: `@molecule/api-resource-user`, `@molecule/api-resource-product`, `@molecule/api-resource-order`
- **Email**: `@molecule/api-emails-mailgun`
- **Frontend / UI**: `@molecule/app-data-table`, `@molecule/app-virtual-scroll`, `@molecule/app-file-upload`
- **Other API**: `@molecule/api-reporting-database`
- **Payments & billing**: `@molecule/api-payments-stripe`
- **Search**: `@molecule/api-search-meilisearch`
- **Uploads & media**: `@molecule/api-uploads-s3`, `@molecule/api-image-sharp`

## Required secrets

- DATABASE_URL — PostgreSQL connection string
- STRIPE_SECRET_KEY — Stripe secret API key
- STRIPE_PUBLISHABLE_KEY — Stripe publishable key
- STRIPE_WEBHOOK_SECRET — Stripe webhook signing secret
- S3_BUCKET — S3 bucket for digital assets
- AWS_ACCESS_KEY_ID — AWS access key
- AWS_SECRET_ACCESS_KEY — AWS secret key
- MAILGUN_API_KEY — Mailgun API key
- MAILGUN_DOMAIN — Mailgun domain
- MEILISEARCH_API_KEY — MeiliSearch API key
