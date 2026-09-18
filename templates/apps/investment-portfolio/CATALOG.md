# Investment Portfolio

- **slug**: `investment-portfolio`
- **cluster**: finance
- **type**: full-stack
- **layout**: dashboard

Robinhood-like portfolio dashboard with holdings, performance tracking, news, and watchlist

> **This is a complete, working app, already built.** The data model, handlers, and screens below all exist on disk (paths shown). Treat this as the user's existing codebase: **adapt the listed files in place** for the request; do not recreate tables, handlers, or pages that already exist, and do not add packages for functionality already implemented here.

## Features

`auth`, `search`, `notifications`, `reports`

## Data model (11 domain tables)

_Already created by the existing SQL in `api/migrations/` — do NOT add new migrations for these tables._

- **assets** — id, symbol, name, asset_class, description, last_price_cents, market_price_cents, fifty_two_week_high_cents, fifty_two_week_low_cents, pe_ratio, market_cap_cents, dividend_yield_pct, …
- **bookmarks** — id, userId, resourceType, resourceId, folder, createdAt, updatedAt
- **devices** — id, createdAt, updatedAt, userId, name, pushPlatform, pushSubscription, hasPushSubscription
- **holdings** — id, user_id, account_id, symbol, name, asset_class, shares, avg_cost_cents, cost_basis_cents, market_value_cents, allocation_pct, pnl_cents, …
- **investment_transactions** — id, user_id, account, symbol, asset_name, kind, type, shares, price_cents, fee_cents, total_cents, price_per_share, …
- **news_articles** — id, title, source, summary, content, url, symbol, related_symbols, published_at, created_at
- **notifications** — id, createdAt, updatedAt
- **target_allocations** — id, user_id, asset_class, target_pct, created_at, updatedAt
- **watchlist** — id, user_id, symbol, name, asset_class, last_price_cents, day_change_pct, alert_direction, alert_threshold_cents, target_price, notes, created_at
- **notification_preferences** — id, user_id, price_alerts, rebalance_drift, dividends_paid, tax_docs_ready, created_at, updated_at
- **user_settings** — id, user_id, advisor_email, tax_method, created_at, updated_at

## API surface (handlers)

_These endpoints already exist — open and extend the named file, never recreate it._

- **holdings** — `api/src/handlers/holdings.ts`
- **news** — `api/src/handlers/news.ts`
- **notification-preferences** — `api/src/handlers/notification-preferences.ts`
- **notifications** — `api/src/handlers/notifications.ts`
- **reports** — `api/src/handlers/reports.ts`
- **transactions** — `api/src/handlers/transactions.ts`
- **user-settings** — `api/src/handlers/user-settings.ts`
- **watchlist** — `api/src/handlers/watchlist.ts`

## Screens (14)

_These pages already exist — edit the named file in place, never create a parallel one._

- **Landing** `/` → `app/src/pages/Landing.tsx`
- **Login** `/login` → `app/src/pages/Login.tsx`
- **Signup** `/signup` → `app/src/pages/Signup.tsx`
- **ForgotPassword** `/forgot-password` → `app/src/pages/ForgotPassword.tsx`
- **ResetPassword** `/reset-password` → `app/src/pages/ResetPassword.tsx`
- **Dashboard** `/dashboard` (auth) → `app/src/pages/Dashboard.tsx`
- **Holdings** `/holdings` (auth) → `app/src/pages/Holdings.tsx`
- **AssetDetail** `/assets/:symbol` (auth) → `app/src/pages/AssetDetail.tsx`
- **Watchlist** `/watchlist` (auth) → `app/src/pages/Watchlist.tsx`
- **Transactions** `/transactions` (auth) → `app/src/pages/Transactions.tsx`
- **News** `/news` (auth) → `app/src/pages/News.tsx`
- **Settings** `/settings` (auth) → `app/src/pages/Settings.tsx`
- **Rebalance** `/rebalance` (auth) → `app/src/pages/Rebalance.tsx`
- **Reports** `/reports` (auth) → `app/src/pages/Reports.tsx`

## Subscription tiers

free / pro / team — gated by: maxHoldings, maxNews, maxPerformance, maxTransactions, maxWatchlist, advancedFeatures, canExport, retentionDays

## Integrations (11 @molecule/* packages)

- **AI**: `@molecule/api-ai-summarization`
- **Database**: `@molecule/api-database-postgresql`
- **Domain resources**: `@molecule/api-resource-user`, `@molecule/api-resource-bookmark`, `@molecule/api-resource-notification`
- **Frontend / UI**: `@molecule/app-data-table`, `@molecule/app-date-range-picker`, `@molecule/app-virtual-scroll`
- **Other API**: `@molecule/api-cron-node-cron`, `@molecule/api-reporting-database`
- **Search**: `@molecule/api-search-meilisearch`

## Required secrets

- DATABASE_URL — PostgreSQL connection string
- MEILISEARCH_API_KEY — Meilisearch API key
