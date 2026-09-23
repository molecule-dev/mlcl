# Online Store

- **slug**: `online-store`
- **cluster**: ecommerce
- **type**: full-stack
- **layout**: dashboard

Shopify-like storefront with product catalog, cart, checkout, and inventory management

> **This is a complete, working app, already built.** The data model, handlers, and screens below all exist on disk (paths shown). Treat this as the user's existing codebase: **adapt the listed files in place** for the request; do not recreate tables, handlers, or pages that already exist, and do not add packages for functionality already implemented here.

## Features

`auth`, `search`, `payments`, `notifications`, `image-upload`

## Data model (10 domain tables)

_Already created by the existing SQL in `api/migrations/` — do NOT add new migrations for these tables._

- **cart_items** — id, user_id, product_id, variant_id, quantity, created_at, updatedAt
- **wishlists** — id, user_id, product_id, created_at, updatedAt
- **newsletter_subscriptions** — id, email, created_at, updatedAt
- **devices** — id, createdAt, updatedAt, userId, name, pushPlatform, pushSubscription, hasPushSubscription
- **inventory** — id, product_id, available, reserved, reason, updated_at, updatedAt, created_at
- **order_items** — id, order_id, product_id, variant_id, quantity, unit_price, name, created_at, updatedAt
- **orders** — id, user_id, status, subtotal, tax, shipping, total, currency, shipping_address, billing_address, payment_method_id, created_at, …
- **payments** — id, createdAt, updatedAt, userId, transactionId, productId, platformKey, data, receipt
- **products** — id, user_id, name, description, price, category, sku, variants, tags, images, thumbnails, status, …
- **reviews** — id, user_id, product_id, rating, title, body, status, created_at, updatedAt

## API surface (handlers)

_These endpoints already exist — open and extend the named file, never recreate it._

- **\_test** — `api/src/handlers/_test.ts`
- **admin** — `api/src/handlers/admin.ts`
- **cart** — `api/src/handlers/cart.ts`
- **newsletter** — `api/src/handlers/newsletter.ts`
- **orders** — `api/src/handlers/orders.ts`
- **products** — `api/src/handlers/products.ts`
- **reviews** — `api/src/handlers/reviews.ts`
- **settings** — `api/src/handlers/settings.ts`
- **storefront** — `api/src/handlers/storefront.ts`
- **wishlist** — `api/src/handlers/wishlist.ts`

## Screens (18)

_These pages already exist — edit the named file in place, never create a parallel one._

- **StorefrontPage** `/` → `app/src/pages/StorefrontPage.tsx`
- **ProductDetailPage** `/product/:id` → `app/src/pages/ProductDetailPage.tsx`
- **CartPage** `/cart` → `app/src/pages/CartPage.tsx`
- **CheckoutPage** `/checkout` (auth) → `app/src/pages/CheckoutPage.tsx`
- **OrdersPage** `/orders` (auth) → `app/src/pages/OrdersPage.tsx`
- **AdminProductsPage** `/admin/products` (auth) → `app/src/pages/AdminProductsPage.tsx`
- **AdminOrdersPage** `/admin/orders` (auth) → `app/src/pages/AdminOrdersPage.tsx`
- **Login** `/login` → `app/src/pages/Login.tsx`
- **AdminDashboardPage** `/admin` (auth) → `app/src/pages/AdminDashboardPage.tsx`
- **AdminSettingsPage** `/admin/settings` (auth) → `app/src/pages/AdminSettingsPage.tsx`
- **CategoryPage** `/category/:slug` → `app/src/pages/CategoryPage.tsx`
- **OrderDetailPage** `/orders/:id` (auth) → `app/src/pages/OrderDetailPage.tsx`
- **SearchPage** `/search` → `app/src/pages/SearchPage.tsx`
- **Settings** `/settings` (auth) → `app/src/pages/Settings.tsx`
- **WishlistPage** `/wishlist` (auth) → `app/src/pages/WishlistPage.tsx`
- **Signup** `/signup` → `app/src/pages/Signup.tsx`
- **ForgotPassword** `/forgot-password` → `app/src/pages/ForgotPassword.tsx`
- **ResetPassword** `/reset-password` → `app/src/pages/ResetPassword.tsx`

## Subscription tiers

free / pro / team — gated by: maxProducts, maxOrdersPerMonth, maxSkuVariantsPerProduct, maxStorageMb, customDomain, abandonedCartRecovery, advancedAnalytics, transactionFeePercent, multiCurrency

## Integrations (18 @molecule/* packages)

- **AI**: `@molecule/api-ai-openai`
- **Auth & permissions**: `@molecule/api-oauth-google`, `@molecule/api-oauth-github`
- **Database**: `@molecule/api-database-postgresql`
- **Domain resources**: `@molecule/api-resource-user`, `@molecule/api-resource-product`, `@molecule/api-resource-cart`, `@molecule/api-resource-order`, `@molecule/api-resource-inventory`, `@molecule/api-resource-review`
- **Email**: `@molecule/api-emails-mailgun`
- **Frontend / UI**: `@molecule/app-data-table`, `@molecule/app-gallery`, `@molecule/app-virtual-scroll`
- **Payments & billing**: `@molecule/api-payments-stripe`
- **Search**: `@molecule/api-search-meilisearch`
- **Uploads & media**: `@molecule/api-image-sharp`, `@molecule/api-uploads-s3`

## Required secrets

- DATABASE_URL — PostgreSQL connection string
- STRIPE_SECRET_KEY — Stripe secret API key for payment processing
- STRIPE_PUBLISHABLE_KEY — Stripe publishable key for client-side checkout
- STRIPE_WEBHOOK_SECRET — Stripe webhook signing secret
- MEILISEARCH_API_KEY — MeiliSearch admin API key
- S3_BUCKET — S3 bucket for product images
- AWS_ACCESS_KEY_ID — AWS access key for S3
- AWS_SECRET_ACCESS_KEY — AWS secret key for S3
- MAILGUN_API_KEY — Mailgun API key for transactional emails
- MAILGUN_DOMAIN — Mailgun sending domain
- OPENAI_API_KEY — OpenAI API key for product recommendations
