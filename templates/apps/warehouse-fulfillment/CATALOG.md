# Warehouse Fulfillment

- **slug**: `warehouse-fulfillment`
- **cluster**: operations-iot
- **type**: full-stack
- **layout**: admin

ShipBob-like warehouse fulfillment with orders, picking, packing, shipping, and tracking

> **This is a complete, working app, already built.** The data model, handlers, and screens below all exist on disk (paths shown). Treat this as the user's existing codebase: **adapt the listed files in place** for the request; do not recreate tables, handlers, or pages that already exist, and do not add packages for functionality already implemented here.

## Features

`auth`, `search`, `realtime`, `picking`, `packing`, `shipping`, `reporting`

## Data model (21 domain tables)

_Already created by the existing SQL in `api/migrations/` — do NOT add new migrations for these tables._

- **devices** — id, createdAt, updatedAt, userId, name, pushPlatform, pushSubscription, hasPushSubscription
- **inventory_movements** — id, productId, variantId, type, quantity, reason, referenceId, createdAt
- **inventory_reservations** — id, productId, variantId, quantity, orderId, createdAt
- **inventory_stock** — id, productId, variantId, total, reserved, lowStockThreshold, createdAt, updatedAt
- **locations** — id, user_id, zone_id, code, bin_capacity, current_occupancy_pct, created_at, updated_at
- **notifications** — id, user_id, kind, body, payload, read_at, created_at
- **order_events** — id, orderId, status, metadata, createdAt
- **order_items** — id, orderId, productId, variantId, name, price, quantity, image
- **orders** — id, userId, status, subtotal, tax, shipping, discount, total, shippingAddress, billingAddress, paymentId, notes, …
- **pick_lines** — id, user_id, pick_list_id, product_variant_id, location_id, quantity_to_pick, quantity_picked, picked_at, created_at
- **pick_lists** — id, user_id, order_id, status, assigned_user_id, started_at, completed_at, created_at, updated_at
- **product_variants** — id, productId, name, sku, price, inventory, createdAt, updatedAt
- **products** — id, name, slug, description, price, currency, status, imageUrl, sku, inventory, createdAt, updatedAt, …
- **receipt_items** — id, user_id, receipt_id, product_variant_id, expected_qty, received_qty, created_at
- **receipts** — id, user_id, supplier, expected_at, received_at, status, received_by_user_id, created_at, updated_at
- **return_items** — id, user_id, return_id, product_variant_id, quantity, condition, restock_to_location_id, created_at
- **returns** — id, user_id, original_order_id, rma_number, reason, status, received_at, created_at, updated_at
- **shipment_events** — id, user_id, shipment_id, status, description, location, created_at
- **shipments** — id, user_id, order_id, carrier, tracking_number, label_s3_key, weight_oz, status, shipped_at, delivered_at, created_at, updated_at
- **zones** — id, user_id, name, kind, description, created_at, updated_at
- **user_preferences** — user_id, data, updated_at

## API surface (handlers)

_These endpoints already exist — open and extend the named file, never recreate it._

- **inventory** — `api/src/handlers/inventory.ts`
- **locations** — `api/src/handlers/locations.ts`
- **notifications** — `api/src/handlers/notifications.ts`
- **orders** — `api/src/handlers/orders.ts`
- **packing** — `api/src/handlers/packing.ts`
- **picks** — `api/src/handlers/picks.ts`
- **preferences** — `api/src/handlers/preferences.ts`
- **receipts** — `api/src/handlers/receipts.ts`
- **returns** — `api/src/handlers/returns.ts`
- **setup** — `api/src/handlers/setup.ts`
- **shipments** — `api/src/handlers/shipments.ts`
- **zones** — `api/src/handlers/zones.ts`

## Screens (21)

_These pages already exist — edit the named file in place, never create a parallel one._

- **Landing** `/` → `app/src/pages/Landing.tsx`
- **Login** `/login` → `app/src/pages/Login.tsx`
- **Signup** `/signup` → `app/src/pages/Signup.tsx`
- **ForgotPassword** `/forgot-password` → `app/src/pages/ForgotPassword.tsx`
- **ResetPassword** `/reset-password` → `app/src/pages/ResetPassword.tsx`
- **Dashboard** `/dashboard` (auth) → `app/src/pages/Dashboard.tsx`
- **Orders** `/orders` (auth) → `app/src/pages/Orders.tsx`
- **OrderDetail** `/orders/:id` (auth) → `app/src/pages/OrderDetail.tsx`
- **PickList** `/pick/:id` (auth) → `app/src/pages/PickList.tsx`
- **Inventory** `/inventory` (auth) → `app/src/pages/Inventory.tsx`
- **Shipments** `/shipments` (auth) → `app/src/pages/Shipments.tsx`
- **Settings** `/settings` (auth) → `app/src/pages/Settings.tsx`
- **InventoryDetail** `/inventory/:sku` (auth) → `app/src/pages/InventoryDetail.tsx`
- **ShipmentDetail** `/shipments/:id` (auth) → `app/src/pages/ShipmentDetail.tsx`
- **Receiving** `/receiving` (auth) → `app/src/pages/Receiving.tsx`
- **Returns** `/returns` (auth) → `app/src/pages/Returns.tsx`
- **Reports** `/reports` (auth) → `app/src/pages/Reports.tsx`
- **Notifications** `/notifications` (auth) → `app/src/pages/Notifications.tsx`
- **Profile** `/profile` (auth) → `app/src/pages/Profile.tsx`
- **Scanner** `/scan` (auth) → `app/src/pages/Scanner.tsx`
- **Locations** `/locations` (auth) → `app/src/pages/Locations.tsx`

## Subscription tiers

free / pro / team — gated by: maxOrders, maxPacking, maxPicks, maxShipments, maxZones, advancedFeatures, canExport, retentionDays

## Integrations (18 @molecule/* packages)

- **Database**: `@molecule/api-database-postgresql`
- **Domain resources**: `@molecule/api-resource-user`, `@molecule/api-resource-order`, `@molecule/api-resource-product`, `@molecule/api-resource-inventory`
- **Email**: `@molecule/api-emails-mailgun`
- **Frontend / UI**: `@molecule/app-data-table`, `@molecule/app-charts`, `@molecule/app-virtual-scroll`, `@molecule/app-command-palette`, `@molecule/app-keyboard-shortcuts`
- **Notifications**: `@molecule/api-push-notifications-web-push`
- **Other API**: `@molecule/api-import-export-csv`, `@molecule/api-reporting-database`, `@molecule/api-cron-node-cron`
- **Realtime**: `@molecule/api-realtime-socketio`, `@molecule/app-realtime-socketio`
- **Search**: `@molecule/api-search-meilisearch`

## Required secrets

- DATABASE_URL — PostgreSQL connection string
- MEILISEARCH_API_KEY — MeiliSearch API key
- MAILGUN_API_KEY — Mailgun API key for shipping notifications
- MAILGUN_DOMAIN — Mailgun sending domain
