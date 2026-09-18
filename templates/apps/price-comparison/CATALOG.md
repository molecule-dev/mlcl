# Price Comparison

- **slug**: `price-comparison`
- **cluster**: ecommerce
- **type**: full-stack
- **layout**: dashboard

Google Shopping-like price comparison with multi-source data, price history tracking, and drop alerts

> **This is a complete, working app, already built.** The data model, handlers, and screens below all exist on disk (paths shown). Treat this as the user's existing codebase: **adapt the listed files in place** for the request; do not recreate tables, handlers, or pages that already exist, and do not add packages for functionality already implemented here.

## Features

`auth`, `search`, `notifications`

## Data model (9 domain tables)

_Already created by the existing SQL in `api/migrations/` — do NOT add new migrations for these tables._

- **devices** — id, createdAt, updatedAt, userId, name, pushPlatform, pushSubscription, hasPushSubscription
- **notifications** — id, user_id, type, payload, read_at, created_at
- **price_alerts** — id, user_id, product_id, target_price, alert_type, status, channel, last_notified_at, times_triggered, created_at, updatedAt
- **price_entries** — id, product_id, source_id, price, currency, url, in_stock, is_current, recorded_at, created_at
- **price_history** — id, product_id, source_id, price, currency, in_stock, recorded_at, created_at
- **product_variants** — id, productId, name, sku, price, inventory, createdAt, updatedAt
- **products** — id, name, slug, description, price, currency, status, imageUrl, sku, inventory, createdAt, updatedAt, …
- **sources** — id, name, slug, base_url, logo_url, fetch_config, status, last_fetched_at, last_fetch_error, fetch_error_count, created_at, updatedAt
- **watchlist_items** — id, user_id, product_id, notes, created_at

## API surface (handlers)

_These endpoints already exist — open and extend the named file, never recreate it._

- **\_test** — `api/src/handlers/_test.ts`
- **alerts** — `api/src/handlers/alerts.ts`
- **notifications** — `api/src/handlers/notifications.ts`
- **prices** — `api/src/handlers/prices.ts`
- **products** — `api/src/handlers/products.ts`
- **sources** — `api/src/handlers/sources.ts`
- **watchlist** — `api/src/handlers/watchlist.ts`

## Screens (18)

_These pages already exist — edit the named file in place, never create a parallel one._

- **Landing** `/` → `app/src/pages/Landing.tsx`
- **Login** `/login` → `app/src/pages/Login.tsx`
- **Signup** `/signup` → `app/src/pages/Signup.tsx`
- **ForgotPassword** `/forgot-password` → `app/src/pages/ForgotPassword.tsx`
- **ResetPassword** `/reset-password` → `app/src/pages/ResetPassword.tsx`
- **Search** `/search` (auth) → `app/src/pages/Search.tsx`
- **ProductDetail** `/products/:id` (auth) → `app/src/pages/ProductDetail.tsx`
- **Alerts** `/alerts` (auth) → `app/src/pages/Alerts.tsx`
- **Deals** `/deals` (auth) → `app/src/pages/Deals.tsx`
- **Watchlist** `/watchlist` (auth) → `app/src/pages/Watchlist.tsx`
- **Settings** `/settings` (auth) → `app/src/pages/Settings.tsx`
- **Dashboard** `/dashboard` (auth) → `app/src/pages/Dashboard.tsx`
- **AlertDetail** `/alerts/:id` (auth) → `app/src/pages/AlertDetail.tsx`
- **Notifications** `/notifications` (auth) → `app/src/pages/Notifications.tsx`
- **Categories** `/categories` (auth) → `app/src/pages/Categories.tsx`
- **PriceHistory** `/products/:id/history` (auth) → `app/src/pages/PriceHistory.tsx`
- **Profile** `/profile` (auth) → `app/src/pages/Profile.tsx`
- **Billing** `/settings/billing` (auth) → `app/src/pages/Billing.tsx`

## Subscription tiers

free / pro / team — gated by: maxAlerts, maxPrices, maxProducts, maxSources, advancedFeatures, canExport, retentionDays

## Integrations (11 @molecule/* packages)

- **Database**: `@molecule/api-database-postgresql`
- **Domain resources**: `@molecule/api-resource-user`, `@molecule/api-resource-product`
- **Email**: `@molecule/api-emails-mailgun`
- **Frontend / UI**: `@molecule/app-data-table`, `@molecule/app-virtual-scroll`, `@molecule/app-charts`
- **Other API**: `@molecule/api-cron-node-cron`, `@molecule/api-http-axios`, `@molecule/api-cache-redis`
- **Search**: `@molecule/api-search-meilisearch`

## Required secrets

- DATABASE_URL — PostgreSQL connection string
- MEILISEARCH_API_KEY — MeiliSearch admin API key
- MAILGUN_API_KEY — Mailgun API key for alert emails
- MAILGUN_DOMAIN — Mailgun sending domain
