# Grocery Delivery

- **slug**: `grocery-delivery`
- **cluster**: ecommerce
- **type**: full-stack
- **layout**: dashboard

Instacart-like grocery delivery with categories, substitution preferences, delivery slots, and real-time order tracking

> **This is a complete, working app, already built.** The data model, handlers, and screens below all exist on disk (paths shown). Treat this as the user's existing codebase: **adapt the listed files in place** for the request; do not recreate tables, handlers, or pages that already exist, and do not add packages for functionality already implemented here.

## Features

`auth`, `search`, `payments`, `notifications`, `image-upload`, `realtime`, `geolocation`

## Data model (15 domain tables)

_Already created by the existing SQL in `api/migrations/` — do NOT add new migrations for these tables._

- **cart_items** — id, user_id, cart_id, product_id, quantity, substitution_preference, substitute_id, notes, created_at, updated_at
- **carts** — id, user_id, status, created_at, updated_at
- **delivery_slots** — id, date, start_time, end_time, capacity, remaining_capacity, fee_override, region, status, created_at, updated_at
- **delivery_zones** — id, name, polygon, active, created_at, updated_at
- **devices** — id, createdAt, updatedAt, userId, name, pushPlatform, pushSubscription, hasPushSubscription
- **inventory_movements** — id, productId, variantId, type, quantity, reason, referenceId, createdAt
- **inventory_reservations** — id, productId, variantId, quantity, orderId, createdAt
- **inventory_stock** — id, productId, variantId, total, reserved, lowStockThreshold, createdAt, updatedAt
- **order_events** — id, order_id, status, note, created_at
- **order_items** — id, order_id, product_id, original_product_id, name, quantity, unit_price, substitution_preference, substitute_id, is_substitution, created_at
- **orders** — id, user_id, status, subtotal, tax, delivery_fee, tip, total, currency, delivery_slot_id, delivery_address, delivery_instructions, …
- **payments** — id, createdAt, updatedAt, userId, transactionId, productId, platformKey, data, receipt
- **products** — id, created_by, name, slug, description, price, currency, unit, unit_size, category, department, sku, …
- **shopping_list_items** — id, list_id, product_id, quantity, created_at
- **shopping_lists** — id, user_id, name, created_at, updated_at

## API surface (handlers)

_These endpoints already exist — open and extend the named file, never recreate it._

- **\_seed** — `api/src/handlers/_seed.ts`
- **cart** — `api/src/handlers/cart.ts`
- **delivery-slots** — `api/src/handlers/delivery-slots.ts`
- **lists** — `api/src/handlers/lists.ts`
- **orders** — `api/src/handlers/orders.ts`
- **products** — `api/src/handlers/products.ts`

## Screens (15)

_These pages already exist — edit the named file in place, never create a parallel one._

- **Landing** `/` → `app/src/pages/Landing.tsx`
- **Login** `/login` → `app/src/pages/Login.tsx`
- **Signup** `/signup` → `app/src/pages/Signup.tsx`
- **ForgotPassword** `/forgot-password` → `app/src/pages/ForgotPassword.tsx`
- **ResetPassword** `/reset-password` → `app/src/pages/ResetPassword.tsx`
- **Shop** `/shop` (auth) → `app/src/pages/Shop.tsx`
- **ProductDetail** `/product/:id` (auth) → `app/src/pages/ProductDetail.tsx`
- **Cart** `/cart` (auth) → `app/src/pages/Cart.tsx`
- **OrderTracking** `/order/:id` (auth) → `app/src/pages/OrderTracking.tsx`
- **Orders** `/orders` (auth) → `app/src/pages/Orders.tsx`
- **Settings** `/settings` (auth) → `app/src/pages/Settings.tsx`
- **Checkout** `/checkout` (auth) → `app/src/pages/Checkout.tsx`
- **Search** `/search` (auth) → `app/src/pages/Search.tsx`
- **Lists** `/lists` (auth) → `app/src/pages/Lists.tsx`
- **OrderConfirmation** `/order/:id/confirmation` (auth) → `app/src/pages/OrderConfirmation.tsx`

## Subscription tiers

free / pro / team — gated by: maxCart, maxDeliverySlots, maxOrders, maxProducts, advancedFeatures, canExport, retentionDays

## Integrations (18 @molecule/* packages)

- **Database**: `@molecule/api-database-postgresql`
- **Domain resources**: `@molecule/api-resource-user`, `@molecule/api-resource-product`, `@molecule/api-resource-cart`, `@molecule/api-resource-order`, `@molecule/api-resource-inventory`
- **Email**: `@molecule/api-emails-mailgun`
- **Frontend / UI**: `@molecule/app-data-table`, `@molecule/app-virtual-scroll`, `@molecule/app-maps`
- **Other API**: `@molecule/api-geolocation-google`, `@molecule/api-cron-node-cron`
- **Payments & billing**: `@molecule/api-payments-stripe`
- **Realtime**: `@molecule/api-realtime-socketio`, `@molecule/app-realtime-socketio`
- **Search**: `@molecule/api-search-meilisearch`
- **Uploads & media**: `@molecule/api-image-sharp`, `@molecule/api-uploads-s3`

## Required secrets

- DATABASE_URL — PostgreSQL connection string
- STRIPE_SECRET_KEY — Stripe secret API key for payment processing
- STRIPE_PUBLISHABLE_KEY — Stripe publishable key for client-side checkout
- STRIPE_WEBHOOK_SECRET — Stripe webhook signing secret
- MEILISEARCH_API_KEY — MeiliSearch admin API key
- GOOGLE_MAPS_API_KEY — Google Maps API key for delivery routing and address validation
- S3_BUCKET — S3 bucket for product images
- AWS_ACCESS_KEY_ID — AWS access key for S3
- AWS_SECRET_ACCESS_KEY — AWS secret key for S3
- MAILGUN_API_KEY — Mailgun API key for transactional emails
- MAILGUN_DOMAIN — Mailgun sending domain
