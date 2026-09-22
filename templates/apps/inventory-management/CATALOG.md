# Inventory Management

- **slug**: `inventory-management`
- **cluster**: operations-iot
- **type**: full-stack
- **layout**: admin

Cin7-like inventory management with stock levels, SKUs, warehouses, and low-stock alerts

> **This is a complete, working app, already built.** The data model, handlers, and screens below all exist on disk (paths shown). Treat this as the user's existing codebase: **adapt the listed files in place** for the request; do not recreate tables, handlers, or pages that already exist, and do not add packages for functionality already implemented here.

## Features

`auth`, `search`, `import-export`, `reporting`, `alerts`, `multi-warehouse`

## Data model (13 domain tables)

_Already created by the existing SQL in `api/migrations/` — do NOT add new migrations for these tables._

- **alert_rules** — id, product_id, warehouse_id, type, threshold, notify_email, enabled, created_by, created_at, updated_at, updatedAt
- **devices** — id, createdAt, updatedAt, userId, name, pushPlatform, pushSubscription, hasPushSubscription
- **inventory_alerts** — id, rule_id, product_id, warehouse_id, type, severity, message, status, acknowledged_by, acknowledged_at, created_at, updated_at, …
- **products** — id, user_id, name, sku, barcode, category, unit, cost_price, sell_price, description, low_stock_threshold, status, …
- **stock_levels** — id, product_id, warehouse_id, quantity, created_at, updated_at, updatedAt
- **stock_movements** — id, product_id, warehouse_id, quantity_change, reason, reference, performed_by, created_at, updatedAt
- **stock_transfer_items** — id, transfer_id, product_id, quantity, created_at, updatedAt
- **stock_transfers** — id, from_warehouse_id, to_warehouse_id, status, notes, created_by, completed_at, created_at, updated_at, updatedAt
- **warehouses** — id, user_id, name, code, address, city, country, capacity, contact_name, contact_email, status, created_at, …
- **orders** — id, user_id, reference, type, status, partner, warehouse_id, expected_at, received_at, total_units, total_value_cents, notes, …
- **order_items** — id, order_id, product_id, sku, name, expected_quantity, received_quantity, unit_cost_cents, created_at, updatedAt
- **notifications** — id, user_id, kind, icon, title, body, href, read, created_at, updatedAt
- **user_preferences** — id, user_id, data, created_at, updated_at

## API surface (handlers)

_These endpoints already exist — open and extend the named file, never recreate it._

- **\_seed** — `api/src/handlers/_seed.ts`
- **alerts** — `api/src/handlers/alerts.ts`
- **dashboard** — `api/src/handlers/dashboard.ts`
- **notifications** — `api/src/handlers/notifications.ts`
- **orders** — `api/src/handlers/orders.ts`
- **preferences** — `api/src/handlers/preferences.ts`
- **products** — `api/src/handlers/products.ts`
- **reports** — `api/src/handlers/reports.ts`
- **stock** — `api/src/handlers/stock.ts`
- **transfers** — `api/src/handlers/transfers.ts`
- **warehouses** — `api/src/handlers/warehouses.ts`

## Screens (17)

_These pages already exist — edit the named file in place, never create a parallel one._

- **Landing** `/` → `app/src/pages/Landing.tsx`
- **Login** `/login` → `app/src/pages/Login.tsx`
- **Signup** `/signup` → `app/src/pages/Signup.tsx`
- **ForgotPassword** `/forgot-password` → `app/src/pages/ForgotPassword.tsx`
- **ResetPassword** `/reset-password` → `app/src/pages/ResetPassword.tsx`
- **Dashboard** `/dashboard` (auth) → `app/src/pages/Dashboard.tsx`
- **Inventory** `/inventory` (auth) → `app/src/pages/Inventory.tsx`
- **ProductDetail** `/products/:id` (auth) → `app/src/pages/ProductDetail.tsx`
- **Warehouses** `/warehouses` (auth) → `app/src/pages/Warehouses.tsx`
- **Orders** `/orders` (auth) → `app/src/pages/Orders.tsx`
- **Reports** `/reports` (auth) → `app/src/pages/Reports.tsx`
- **Settings** `/settings` (auth) → `app/src/pages/Settings.tsx`
- **OrderDetail** `/orders/:id` (auth) → `app/src/pages/OrderDetail.tsx`
- **WarehouseDetail** `/warehouses/:id` (auth) → `app/src/pages/WarehouseDetail.tsx`
- **StockTransfer** `/transfers` (auth) → `app/src/pages/StockTransfer.tsx`
- **Notifications** `/notifications` (auth) → `app/src/pages/Notifications.tsx`
- **Profile** `/profile` (auth) → `app/src/pages/Profile.tsx`

## Subscription tiers

free / pro / team — gated by: maxAlerts, maxProducts, maxStock, maxTransfers, maxWarehouses, advancedFeatures, canExport, retentionDays

## Integrations (17 @molecule/* packages)

- **Database**: `@molecule/api-database-postgresql`
- **Domain resources**: `@molecule/api-resource-user`, `@molecule/api-resource-product`, `@molecule/api-resource-inventory`, `@molecule/api-resource-order`
- **Email**: `@molecule/api-emails-mailgun`
- **Frontend / UI**: `@molecule/app-data-table`, `@molecule/app-charts`, `@molecule/app-virtual-scroll`, `@molecule/app-command-palette`, `@molecule/app-file-upload`, `@molecule/app-date-range-picker`
- **Notifications**: `@molecule/api-push-notifications-web-push`
- **Other API**: `@molecule/api-import-export-csv`, `@molecule/api-reporting-database`, `@molecule/api-cron-node-cron`
- **Search**: `@molecule/api-search-meilisearch`

## Required secrets

- DATABASE_URL — PostgreSQL connection string
- MEILISEARCH_API_KEY — MeiliSearch API key
- MAILGUN_API_KEY — Mailgun API key for alert emails
- MAILGUN_DOMAIN — Mailgun sending domain
