# Crypto Tracker

- **slug**: `crypto-tracker`
- **cluster**: finance
- **type**: full-stack
- **layout**: dashboard

CoinGecko-like cryptocurrency tracker with portfolio, price charts, alerts, and market data

> **This is a complete, working app, already built.** The data model, handlers, and screens below all exist on disk (paths shown). Treat this as the user's existing codebase: **adapt the listed files in place** for the request; do not recreate tables, handlers, or pages that already exist, and do not add packages for functionality already implemented here.

## Features

`auth`, `search`, `notifications`, `alerts`

## Data model (11 domain tables)

_Already created by the existing SQL in `api/migrations/` — do NOT add new migrations for these tables._

- **bookmarks** — id, userId, resourceType, resourceId, folder, createdAt, updatedAt
- **coin_price_history** — id, coin_id, interval, price, timestamp
- **coins** — id, symbol, name, market_cap_rank, current_price, market_cap_usd, market_cap, volume_24h_usd, volume_24h, change_1h_pct, change_24h_pct, price_change_24h_pct, …
- **crypto_holdings** — id, user_id, coin_id, symbol, name, amount, avg_buy_price, total_cost, cost_basis_usd, current_value, current_value_usd, created_at, …
- **crypto_news** — id, title, source, summary, url, related_symbols, signal, published_at
- **crypto_transactions** — id, user_id, symbol, kind, amount, price_usd, fee_usd, exchange, total_usd, occurred_at, notes, created_at
- **crypto_watchlist** — id, user_id, coin_id, symbol, name, target_price, alert_direction, alert_threshold_cents, notes, added_at
- **devices** — id, createdAt, updatedAt, userId, name, pushPlatform, pushSubscription, hasPushSubscription
- **notifications** — id, createdAt, updatedAt, user_id, type, title, body, href, unread, created_at
- **user_preferences** — user_id, display_name, quote_currency, locale, refresh_seconds, theme, notify_email, notify_push, notify_sms, created_at, updated_at
- **price_alerts** — id, user_id, coin_id, symbol, condition, target_price, is_active, channels, repeat, notes, triggered_at, created_at

## API surface (handlers)

_These endpoints already exist — open and extend the named file, never recreate it._

- **\_seed** — `api/src/handlers/_seed.ts`
- **alerts** — `api/src/handlers/alerts.ts`
- **markets** — `api/src/handlers/markets.ts`
- **news** — `api/src/handlers/news.ts`
- **notifications** — `api/src/handlers/notifications.ts`
- **portfolio** — `api/src/handlers/portfolio.ts`
- **preferences** — `api/src/handlers/preferences.ts`
- **reports** — `api/src/handlers/reports.ts`
- **transactions** — `api/src/handlers/transactions.ts`
- **watchlist** — `api/src/handlers/watchlist.ts`

## Screens (15)

_These pages already exist — edit the named file in place, never create a parallel one._

- **Login** `/login` → `app/src/pages/Login.tsx`
- **Signup** `/signup` → `app/src/pages/Signup.tsx`
- **ForgotPassword** `/forgot-password` → `app/src/pages/ForgotPassword.tsx`
- **ResetPassword** `/reset-password` → `app/src/pages/ResetPassword.tsx`
- **Dashboard** `/dashboard` (auth) → `app/src/pages/Dashboard.tsx`
- **Markets** `/markets` (auth) → `app/src/pages/Markets.tsx`
- **CoinDetail** `/coin/:symbol` (auth) → `app/src/pages/CoinDetail.tsx`
- **Portfolio** `/portfolio` (auth) → `app/src/pages/Portfolio.tsx`
- **Watchlist** `/watchlist` (auth) → `app/src/pages/Watchlist.tsx`
- **Alerts** `/alerts` (auth) → `app/src/pages/Alerts.tsx`
- **Settings** `/settings` (auth) → `app/src/pages/Settings.tsx`
- **News** `/news` (auth) → `app/src/pages/News.tsx`
- **Transactions** `/transactions` (auth) → `app/src/pages/Transactions.tsx`
- **AlertNew** `/alerts/new` (auth) → `app/src/pages/AlertNew.tsx`
- **NotFound** `/404` → `app/src/pages/NotFound.tsx`

## Subscription tiers

free / pro / team — gated by: maxAlerts, maxCoins, maxMarket, maxPortfolio, advancedFeatures, canExport, retentionDays

## Integrations (10 @molecule/* packages)

- **Database**: `@molecule/api-database-postgresql`
- **Domain resources**: `@molecule/api-resource-user`, `@molecule/api-resource-bookmark`, `@molecule/api-resource-notification`
- **Frontend / UI**: `@molecule/app-data-table`, `@molecule/app-virtual-scroll`, `@molecule/app-date-range-picker`
- **Other API**: `@molecule/api-cron-node-cron`, `@molecule/api-encryption-aes`
- **Search**: `@molecule/api-search-meilisearch`

## Required secrets

- DATABASE_URL — PostgreSQL connection string
- ENCRYPTION_KEY — AES key for encrypting API keys
- MEILISEARCH_API_KEY — Meilisearch API key
