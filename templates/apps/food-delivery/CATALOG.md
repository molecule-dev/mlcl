# Food Delivery

- **slug**: `food-delivery`
- **cluster**: ecommerce
- **type**: full-stack
- **layout**: dashboard

DoorDash-like food delivery platform with restaurant menus, ordering, driver tracking, and real-time ETA

> **This is a complete, working app, already built.** The data model, handlers, and screens below all exist on disk (paths shown). Treat this as the user's existing codebase: **adapt the listed files in place** for the request; do not recreate tables, handlers, or pages that already exist, and do not add packages for functionality already implemented here.

## Features

`auth`, `search`, `payments`, `notifications`, `realtime`, `geolocation`, `image-upload`, `push-notifications`

## Data model (16 domain tables)

_Already created by the existing SQL in `api/migrations/` — do NOT add new migrations for these tables._

- **addresses** — id, user_id, label, street, city, postal_code, country, lat, lng, is_default, created_at, updated_at
- **delivery_tracking** — id, order_id, driver_id, status, driver_lat, driver_lng, eta_minutes, started_at, completed_at, updated_at, created_at
- **devices** — id, createdAt, updatedAt, userId, name, pushPlatform, pushSubscription, hasPushSubscription
- **driver_locations** — id, driver_id, order_id, lat, lng, recorded_at
- **favorites** — id, user_id, restaurant_id, created_at
- **menu_items** — id, restaurant_id, name, description, price, category, dietary_tags, preparation_time, sort_order, status, image_url, thumbnail_url, …
- **menu_modifiers** — id, menu_item_id, name, options, required, max_selections, sort_order, created_at
- **notifications** — id, user_id, type, title, body, payload, read_at, created_at
- **order_events** — id, order_id, status, metadata, created_at
- **order_items** — id, order_id, menu_item_id, name, quantity, unit_price, modifiers, special_instructions, line_total, created_at
- **order_reviews** — id, order_id, customer_id, restaurant_id, driver_id, food_rating, delivery_rating, comment, created_at
- **orders** — id, customer_id, restaurant_id, driver_id, status, subtotal, delivery_fee, service_fee, total, currency, delivery_address, delivery_lat, …
- **payment_methods** — id, user_id, stripe_payment_method_id, brand, last4, exp_month, exp_year, is_default, created_at
- **payments** — id, createdAt, updatedAt, userId, transactionId, productId, platformKey, data, receipt
- **restaurant_reviews** — id, restaurant_id, user_id, order_id, rating, body, created_at
- **restaurants** — id, owner_id, name, description, cuisine, address, phone, latitude, longitude, opening_hours, minimum_order, estimated_delivery_min, …

## API surface (handlers)

_These endpoints already exist — open and extend the named file, never recreate it._

- **\_hours** — `api/src/handlers/_hours.ts`
- **\_seed** — `api/src/handlers/_seed.ts`
- **addresses** — `api/src/handlers/addresses.ts`
- **delivery** — `api/src/handlers/delivery.ts`
- **favorites** — `api/src/handlers/favorites.ts`
- **menu** — `api/src/handlers/menu.ts`
- **notifications** — `api/src/handlers/notifications.ts`
- **orders** — `api/src/handlers/orders.ts`
- **payment-methods** — `api/src/handlers/payment-methods.ts`
- **restaurants** — `api/src/handlers/restaurants.ts`

## Screens (16)

_These pages already exist — edit the named file in place, never create a parallel one._

- **Landing** `/` → `app/src/pages/Landing.tsx`
- **Login** `/login` → `app/src/pages/Login.tsx`
- **Signup** `/signup` → `app/src/pages/Signup.tsx`
- **ForgotPassword** `/forgot-password` → `app/src/pages/ForgotPassword.tsx`
- **ResetPassword** `/reset-password` → `app/src/pages/ResetPassword.tsx`
- **Restaurants** `/restaurants` (auth) → `app/src/pages/Restaurants.tsx`
- **RestaurantMenu** `/restaurant/:id` (auth) → `app/src/pages/RestaurantMenu.tsx`
- **Checkout** `/checkout` (auth) → `app/src/pages/Checkout.tsx`
- **OrderTracking** `/order/:id` (auth) → `app/src/pages/OrderTracking.tsx`
- **Orders** `/orders` (auth) → `app/src/pages/Orders.tsx`
- **Settings** `/settings` (auth) → `app/src/pages/Settings.tsx`
- **Search** `/search` (auth) → `app/src/pages/Search.tsx`
- **Favorites** `/favorites` (auth) → `app/src/pages/Favorites.tsx`
- **Notifications** `/notifications` (auth) → `app/src/pages/Notifications.tsx`
- **OrderConfirmation** `/checkout/confirmation/:id` (auth) → `app/src/pages/OrderConfirmation.tsx`
- **OrderDetail** `/orders/:id` (auth) → `app/src/pages/OrderDetail.tsx`

## Subscription tiers

free / pro / team — gated by: maxDelivery, maxMenu, maxOrders, maxRestaurants, advancedFeatures, canExport, retentionDays

## Integrations (15 @molecule/* packages)

- **Database**: `@molecule/api-database-postgresql`
- **Domain resources**: `@molecule/api-resource-user`, `@molecule/api-resource-order`
- **Email**: `@molecule/api-emails-mailgun`
- **Frontend / UI**: `@molecule/app-data-table`, `@molecule/app-virtual-scroll`, `@molecule/app-maps`
- **Notifications**: `@molecule/api-push-notifications-web-push`
- **Other API**: `@molecule/api-geolocation-google`
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
- GOOGLE_MAPS_API_KEY — Google Maps API key for geocoding and distance calculations
- S3_BUCKET — S3 bucket for restaurant and menu images
- AWS_ACCESS_KEY_ID — AWS access key for S3
- AWS_SECRET_ACCESS_KEY — AWS secret key for S3
- MAILGUN_API_KEY — Mailgun API key for transactional emails
- MAILGUN_DOMAIN — Mailgun sending domain
