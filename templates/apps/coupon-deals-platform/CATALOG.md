# Coupon/Deals Platform

- **slug**: `coupon-deals-platform`
- **cluster**: ecommerce
- **type**: full-stack
- **layout**: dashboard

Groupon-like deals platform with merchant offers, expiry tracking, redemption codes, and QR verification

> **This is a complete, working app, already built.** The data model, handlers, and screens below all exist on disk (paths shown). Treat this as the user's existing codebase: **adapt the listed files in place** for the request; do not recreate tables, handlers, or pages that already exist, and do not add packages for functionality already implemented here.

## Features

`auth`, `search`, `payments`, `notifications`, `image-upload`, `geolocation`, `cron`

## Data model (10 domain tables)

_Already created by the existing SQL in `api/migrations/` — do NOT add new migrations for these tables._

- **categories** — id, name, slug, description, icon, sort_order, status, created_at, updated_at
- **deals** — id, merchant_id, category_id, title, description, terms, original_price, discounted_price, discount_percent, total_quantity, remaining_quantity, starts_at, …
- **devices** — id, createdAt, updatedAt, userId, name, pushPlatform, pushSubscription, hasPushSubscription
- **merchants** — id, user_id, business_name, business_description, contact_email, contact_phone, address, website, logo_url, latitude, longitude, status, …
- **my_coupons** — id, user_id, redemption_id, deal_id, merchant_id, code, status, saved_at, used_at, created_at
- **nearby_deals** — id, deal_id, user_id, merchant_id, title, discount_percent, latitude, longitude, distance_km, expires_at, created_at
- **notifications** — id, user_id, type, title, body, href, entity_id, unread, read_at, created_at
- **payments** — id, createdAt, updatedAt, userId, transactionId, productId, platformKey, data, receipt
- **redemptions** — id, user_id, deal_id, merchant_id, code, qr_data, qr_token, status, purchase_price, savings_cents, merchant_name, payment_id, …
- **user_settings** — user_id, city, preferences, notification_prefs, created_at, updated_at

## API surface (handlers)

_These endpoints already exist — open and extend the named file, never recreate it._

- **\_deal-window** — `api/src/handlers/_deal-window.ts`
- **\_decorate** — `api/src/handlers/_decorate.ts`
- **\_seed** — `api/src/handlers/_seed.ts`
- **\_test** — `api/src/handlers/_test.ts`
- **categories** — `api/src/handlers/categories.ts`
- **deals** — `api/src/handlers/deals.ts`
- **merchants** — `api/src/handlers/merchants.ts`
- **my_coupons** — `api/src/handlers/my_coupons.ts`
- **nearby_deals** — `api/src/handlers/nearby_deals.ts`
- **notifications** — `api/src/handlers/notifications.ts`
- **redemptions** — `api/src/handlers/redemptions.ts`
- **reports** — `api/src/handlers/reports.ts`
- **user_settings** — `api/src/handlers/user_settings.ts`

## Screens (14)

_These pages already exist — edit the named file in place, never create a parallel one._

- **Landing** `/` → `app/src/pages/Landing.tsx`
- **Login** `/login` → `app/src/pages/Login.tsx`
- **Signup** `/signup` → `app/src/pages/Signup.tsx`
- **ForgotPassword** `/forgot-password` → `app/src/pages/ForgotPassword.tsx`
- **ResetPassword** `/reset-password` → `app/src/pages/ResetPassword.tsx`
- **Deals** `/deals` (auth) → `app/src/pages/Deals.tsx`
- **DealDetail** `/deals/:id` (auth) → `app/src/pages/DealDetail.tsx`
- **Merchants** `/merchants` (auth) → `app/src/pages/Merchants.tsx`
- **MyCoupons** `/my-coupons` (auth) → `app/src/pages/MyCoupons.tsx`
- **NearMe** `/near-me` (auth) → `app/src/pages/NearMe.tsx`
- **Dashboard** `/dashboard` (auth) → `app/src/pages/Dashboard.tsx`
- **Settings** `/settings` (auth) → `app/src/pages/Settings.tsx`
- **MerchantDetail** `/merchants/:id` (auth) → `app/src/pages/MerchantDetail.tsx`
- **Notifications** `/notifications` (auth) → `app/src/pages/Notifications.tsx`

## Subscription tiers

free / pro / team — gated by: maxCategories, maxDeals, maxMerchants, maxRedemptions, advancedFeatures, canExport, retentionDays

## Integrations (12 @molecule/* packages)

- **Database**: `@molecule/api-database-postgresql`
- **Domain resources**: `@molecule/api-resource-user`
- **Email**: `@molecule/api-emails-mailgun`
- **Frontend / UI**: `@molecule/app-data-table`, `@molecule/app-virtual-scroll`, `@molecule/app-maps`
- **Other API**: `@molecule/api-geolocation-google`, `@molecule/api-cron-node-cron`
- **Payments & billing**: `@molecule/api-payments-stripe`
- **Search**: `@molecule/api-search-meilisearch`
- **Uploads & media**: `@molecule/api-image-sharp`, `@molecule/api-uploads-s3`

## Required secrets

- DATABASE_URL — PostgreSQL connection string
- STRIPE_SECRET_KEY — Stripe secret API key for payment processing
- STRIPE_PUBLISHABLE_KEY — Stripe publishable key for client-side checkout
- STRIPE_WEBHOOK_SECRET — Stripe webhook signing secret
- MEILISEARCH_API_KEY — MeiliSearch admin API key
- GOOGLE_MAPS_API_KEY — Google Maps API key for location-based deals
- S3_BUCKET — S3 bucket for deal images
- AWS_ACCESS_KEY_ID — AWS access key for S3
- AWS_SECRET_ACCESS_KEY — AWS secret key for S3
- MAILGUN_API_KEY — Mailgun API key for transactional emails
- MAILGUN_DOMAIN — Mailgun sending domain
