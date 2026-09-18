# Auction Platform

- **slug**: `auction-platform`
- **cluster**: ecommerce
- **type**: full-stack
- **layout**: dashboard

eBay-like bidding platform with bid system, countdown timers, and auto-extend

> **This is a complete, working app, already built.** The data model, handlers, and screens below all exist on disk (paths shown). Treat this as the user's existing codebase: **adapt the listed files in place** for the request; do not recreate tables, handlers, or pages that already exist, and do not add packages for functionality already implemented here.

## Features

`auth`, `search`, `payments`, `notifications`, `realtime`, `image-upload`

## Data model (10 domain tables)

_Already created by the existing SQL in `api/migrations/` — do NOT add new migrations for these tables._

- **bids** — id, listing_id, bidder_id, amount, created_at
- **devices** — id, createdAt, updatedAt, userId, name, pushPlatform, pushSubscription, hasPushSubscription
- **listings** — id, seller_id, title, description, category, starting_price, reserve_price, buy_now_price, current_price, bid_count, end_time, ended_at, …
- **notifications** — id, user_id, type, entity_id, read_at, created_at
- **payments** — id, createdAt, updatedAt, userId, transactionId, productId, platformKey, data, receipt
- **product_variants** — id, productId, name, sku, price, inventory, createdAt, updatedAt
- **products** — id, name, slug, description, price, currency, status, imageUrl, sku, inventory, createdAt, updatedAt, …
- **seller_reviews** — id, seller_id, reviewer_id, rating, body, created_at
- **watchlist** — id, user_id, listing_id, created_at
- **won_orders** — id, listing_id, buyer_id, seller_id, amount, shipping_address, status, payment_id, created_at, updated_at

## API surface (handlers)

_These endpoints already exist — open and extend the named file, never recreate it._

- **\_notify** — `api/src/handlers/_notify.ts`
- **auctions** — `api/src/handlers/auctions.ts`
- **auth-reset-password** — `api/src/handlers/auth-reset-password.ts`
- **bids** — `api/src/handlers/bids.ts`
- **checkout** — `api/src/handlers/checkout.ts`
- **listings** — `api/src/handlers/listings.ts`
- **me** — `api/src/handlers/me.ts`
- **my-bids** — `api/src/handlers/my-bids.ts`
- **notifications** — `api/src/handlers/notifications.ts`
- **seller** — `api/src/handlers/seller.ts`
- **sellers** — `api/src/handlers/sellers.ts`
- **watchlist** — `api/src/handlers/watchlist.ts`

## Screens (15)

_These pages already exist — edit the named file in place, never create a parallel one._

- **Landing** `/` → `app/src/pages/Landing.tsx`
- **Login** `/login` → `app/src/pages/Login.tsx`
- **Signup** `/signup` → `app/src/pages/Signup.tsx`
- **ForgotPassword** `/forgot-password` → `app/src/pages/ForgotPassword.tsx`
- **ResetPassword** `/reset-password` → `app/src/pages/ResetPassword.tsx`
- **BrowseAuctions** `/auctions` (auth) → `app/src/pages/BrowseAuctions.tsx`
- **AuctionDetail** `/auctions/:id` (auth) → `app/src/pages/AuctionDetail.tsx`
- **MyBids** `/my-bids` (auth) → `app/src/pages/MyBids.tsx`
- **SellListing** `/sell/new` (auth) → `app/src/pages/SellListing.tsx`
- **Watchlist** `/watchlist` (auth) → `app/src/pages/Watchlist.tsx`
- **Settings** `/settings` (auth) → `app/src/pages/Settings.tsx`
- **SellerDashboard** `/seller` (auth) → `app/src/pages/SellerDashboard.tsx`
- **Notifications** `/notifications` (auth) → `app/src/pages/Notifications.tsx`
- **SellerProfile** `/sellers/:handle` (auth) → `app/src/pages/SellerProfile.tsx`
- **WonAuctionCheckout** `/my-bids/won/:id/checkout` (auth) → `app/src/pages/WonAuctionCheckout.tsx`

## Subscription tiers

free / pro / team — gated by: maxBids, maxListings, maxWatchlist, advancedFeatures, canExport, retentionDays

## Integrations (14 @molecule/* packages)

- **Database**: `@molecule/api-database-postgresql`
- **Domain resources**: `@molecule/api-resource-user`, `@molecule/api-resource-product`
- **Email**: `@molecule/api-emails-mailgun`
- **Frontend / UI**: `@molecule/app-data-table`, `@molecule/app-gallery`, `@molecule/app-virtual-scroll`
- **Other API**: `@molecule/api-cron-node-cron`
- **Payments & billing**: `@molecule/api-payments-stripe`
- **Realtime**: `@molecule/api-realtime-socketio`, `@molecule/app-realtime-socketio`
- **Search**: `@molecule/api-search-meilisearch`
- **Uploads & media**: `@molecule/api-image-sharp`, `@molecule/api-uploads-s3`

## Required secrets

- DATABASE_URL — PostgreSQL connection string
- STRIPE_SECRET_KEY — Stripe secret key
- STRIPE_PUBLISHABLE_KEY — Stripe publishable key
- STRIPE_WEBHOOK_SECRET — Stripe webhook secret
- MEILISEARCH_API_KEY — MeiliSearch API key
- S3_BUCKET — S3 bucket for listing images
- AWS_ACCESS_KEY_ID — AWS access key
- AWS_SECRET_ACCESS_KEY — AWS secret key
- MAILGUN_API_KEY — Mailgun API key
- MAILGUN_DOMAIN — Mailgun domain
