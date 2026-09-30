# Restaurant Ordering

- **slug**: `restaurant-ordering`
- **cluster**: ecommerce
- **type**: full-stack
- **layout**: dashboard

Toast-like POS with table-side QR ordering, menu management, kitchen display, and real-time order tracking

> **This is a complete, working app, already built.** The data model, handlers, and screens below all exist on disk (paths shown). Treat this as the user's existing codebase: **adapt the listed files in place** for the request; do not recreate tables, handlers, or pages that already exist, and do not add packages for functionality already implemented here.

## Features

`auth`, `payments`, `realtime`, `image-upload`, `notifications`

## Data model (11 domain tables)

_Already created by the existing SQL in `api/migrations/` — do NOT add new migrations for these tables._

- **customers** — id, user_id, name, email, phone, total_visits, total_spent, last_visit_at, created_at, updated_at
- **devices** — id, createdAt, updatedAt, userId, name, pushPlatform, pushSubscription, hasPushSubscription
- **menu_items** — id, user_id, name, description, price, category, image_url, dietary_tags, available, sort_order, created_at, updated_at
- **notifications** — id, user_id, type, payload, read_at, created_at
- **order_events** — id, order_id, status, metadata, created_at
- **order_items** — id, order_id, menu_item_id, name, quantity, unit_price, status, special_instructions, created_at
- **orders** — id, user_id, table_id, customer_id, table_number, status, subtotal, tax, total, tip, currency, payment_id, …
- **payments** — id, createdAt, updatedAt, userId, transactionId, productId, platformKey, data, receipt
- **reservations** — id, user_id, customer_id, table_id, party_size, scheduled_for, status, notes, created_at, updated_at
- **tables** — id, user_id, table_number, seats, section, status, created_at, updated_at
- **emergency_contacts** — id, user_id, contact_name, contact_phone, created_at, updated_at

## API surface (handlers)

_These endpoints already exist — open and extend the named file, never recreate it._

- **\_debug** — `api/src/handlers/_debug.ts`
- **analytics** — `api/src/handlers/analytics.ts`
- **customers** — `api/src/handlers/customers.ts`
- **emergency-contact** — `api/src/handlers/emergency-contact.ts`
- **guest** — `api/src/handlers/guest.ts`
- **kitchen** — `api/src/handlers/kitchen.ts`
- **menu** — `api/src/handlers/menu.ts`
- **notifications** — `api/src/handlers/notifications.ts`
- **orders** — `api/src/handlers/orders.ts`
- **reservations** — `api/src/handlers/reservations.ts`
- **tables** — `api/src/handlers/tables.ts`

## Screens (22)

_These pages already exist — edit the named file in place, never create a parallel one._

- **Landing** `/` → `app/src/pages/Landing.tsx`
- **Login** `/login` → `app/src/pages/Login.tsx`
- **Signup** `/signup` → `app/src/pages/Signup.tsx`
- **ForgotPassword** `/forgot-password` → `app/src/pages/ForgotPassword.tsx`
- **ResetPassword** `/reset-password` → `app/src/pages/ResetPassword.tsx`
- **OrderDashboard** `/dashboard` (auth) → `app/src/pages/OrderDashboard.tsx`
- **Menu** `/menu` (auth) → `app/src/pages/Menu.tsx`
- **OrderDetail** `/orders/:id` (auth) → `app/src/pages/OrderDetail.tsx`
- **Tables** `/tables` (auth) → `app/src/pages/Tables.tsx`
- **Customers** `/customers` (auth) → `app/src/pages/Customers.tsx`
- **Analytics** `/analytics` (auth) → `app/src/pages/Analytics.tsx`
- **Settings** `/settings` (auth) → `app/src/pages/Settings.tsx`
- **MenuItemDetail** `/menu/:id` (auth) → `app/src/pages/MenuItemDetail.tsx`
- **CustomerDetail** `/customers/:id` (auth) → `app/src/pages/CustomerDetail.tsx`
- **OrderHistory** `/orders/history` (auth) → `app/src/pages/OrderHistory.tsx`
- **TableDetail** `/tables/:id` (auth) → `app/src/pages/TableDetail.tsx`
- **Reservations** `/reservations` (auth) → `app/src/pages/Reservations.tsx`
- **Notifications** `/notifications` (auth) → `app/src/pages/Notifications.tsx`
- **Profile** `/profile` (auth) → `app/src/pages/Profile.tsx`
- **Billing** `/settings/billing` (auth) → `app/src/pages/Billing.tsx`
- **GuestMenu** `/menu/guest` → `app/src/pages/GuestMenu.tsx`
- **GuestCart** `/cart` → `app/src/pages/GuestCart.tsx`

## Subscription tiers

free / pro / team — gated by: maxKitchen, maxMenu, maxOrders, maxTables, advancedFeatures, canExport, retentionDays

## Integrations (10 @molecule/* packages)

- **Database**: `@molecule/api-database-postgresql`
- **Domain resources**: `@molecule/api-resource-user`, `@molecule/api-resource-order`
- **Email**: `@molecule/api-emails-mailgun`
- **Frontend / UI**: `@molecule/app-data-table`
- **Payments & billing**: `@molecule/api-payments-stripe`
- **Realtime**: `@molecule/api-realtime-socketio`, `@molecule/app-realtime-socketio`
- **Uploads & media**: `@molecule/api-image-sharp`, `@molecule/api-uploads-s3`

## Required secrets

- DATABASE_URL — PostgreSQL connection string
- STRIPE_SECRET_KEY — Stripe secret API key for payment processing
- STRIPE_PUBLISHABLE_KEY — Stripe publishable key for client-side checkout
- STRIPE_WEBHOOK_SECRET — Stripe webhook signing secret
- S3_BUCKET — S3 bucket for menu item images
- AWS_ACCESS_KEY_ID — AWS access key for S3
- AWS_SECRET_ACCESS_KEY — AWS secret key for S3
- MAILGUN_API_KEY — Mailgun API key for receipt emails
- MAILGUN_DOMAIN — Mailgun sending domain
