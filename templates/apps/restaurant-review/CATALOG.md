# Restaurant Review

- **slug**: `restaurant-review`
- **cluster**: real-estate-travel
- **type**: full-stack
- **layout**: landing

Yelp-like restaurant review platform with ratings, photos, maps, and menus

> **This is a complete, working app, already built.** The data model, handlers, and screens below all exist on disk (paths shown). Treat this as the user's existing codebase: **adapt the listed files in place** for the request; do not recreate tables, handlers, or pages that already exist, and do not add packages for functionality already implemented here.

## Features

`auth`, `search`, `maps`, `bookmarks`, `reviews`

## Data model (14 domain tables)

_Already created by the existing SQL in `api/migrations/` — do NOT add new migrations for these tables._

- **bookmarks** — id, userId, resourceType, resourceId, folder, createdAt, updatedAt
- **comments** — id, resourceType, resourceId, userId, parentId, body, editedAt, createdAt, updatedAt
- **devices** — id, createdAt, updatedAt, userId, name, pushPlatform, pushSubscription, hasPushSubscription
- **follows** — id, follower_id, following_id, created_at, updatedAt
- **list_items** — id, list_id, restaurant_id, position, note, added_at, updatedAt
- **lists** — id, owner_id, name, description, cover_url, visibility, created_at, updated_at, updatedAt
- **menu_items** — id, restaurant_id, name, description, price_cents, currency, category, available, created_at, updated_at, updatedAt
- **notifications** — id, owner_id, type, title, body, href, read, created_at, updatedAt
- **reactions** — id, resourceType, resourceId, userId, type, createdAt, updatedAt
- **restaurant_favorites** — id, owner_id, restaurant_id, created_at, updatedAt
- **restaurant_reviews** — id, restaurant_id, owner_id, title, rating, body, photos, helpful_count, created_at, updated_at, updatedAt
- **restaurants** — id, owner_id, name, slug, cuisine, neighborhood, city, address, description, price_level, thumbnail_url, gallery, …
- **review_helpful** — reviewId, userId, createdAt
- **reviews** — id, resourceType, resourceId, userId, rating, title, body, helpful, createdAt, updatedAt

## API surface (handlers)

_These endpoints already exist — open and extend the named file, never recreate it._

- **\_seed** — `api/src/handlers/_seed.ts`
- **favorites** — `api/src/handlers/favorites.ts`
- **lists** — `api/src/handlers/lists.ts`
- **notifications** — `api/src/handlers/notifications.ts`
- **restaurants** — `api/src/handlers/restaurants.ts`
- **reviews** — `api/src/handlers/reviews.ts`

## Screens (15)

_These pages already exist — edit the named file in place, never create a parallel one._

- **Landing** `/` → `app/src/pages/Landing.tsx`
- **Login** `/login` → `app/src/pages/Login.tsx`
- **Signup** `/signup` → `app/src/pages/Signup.tsx`
- **ForgotPassword** `/forgot-password` → `app/src/pages/ForgotPassword.tsx`
- **ResetPassword** `/reset-password` → `app/src/pages/ResetPassword.tsx`
- **Discover** `/discover` (auth) → `app/src/pages/Discover.tsx`
- **RestaurantDetail** `/restaurants/:id` (auth) → `app/src/pages/RestaurantDetail.tsx`
- **WriteReview** `/restaurants/:id/review` (auth) → `app/src/pages/WriteReview.tsx`
- **MyReviews** `/my-reviews` (auth) → `app/src/pages/MyReviews.tsx`
- **Favorites** `/favorites` (auth) → `app/src/pages/Favorites.tsx`
- **Settings** `/settings` (auth) → `app/src/pages/Settings.tsx`
- **Profile** `/users/:id` (auth) → `app/src/pages/Profile.tsx`
- **Notifications** `/notifications` (auth) → `app/src/pages/Notifications.tsx`
- **Lists** `/lists` (auth) → `app/src/pages/Lists.tsx`
- **EditReview** `/reviews/:id/edit` (auth) → `app/src/pages/EditReview.tsx`

## Subscription tiers

free / pro / team — gated by: maxRestaurants, maxReviews, advancedFeatures, canExport, retentionDays

## Integrations (13 @molecule/* packages)

- **Database**: `@molecule/api-database-postgresql`
- **Domain resources**: `@molecule/api-resource-user`, `@molecule/api-resource-review`, `@molecule/api-resource-reaction`, `@molecule/api-resource-bookmark`, `@molecule/api-resource-comment`
- **Frontend / UI**: `@molecule/app-maps`, `@molecule/app-gallery`, `@molecule/app-virtual-scroll`
- **Other API**: `@molecule/api-geolocation-mapbox`
- **Search**: `@molecule/api-search-meilisearch`
- **Uploads & media**: `@molecule/api-image-sharp`, `@molecule/api-uploads-s3`

## Required secrets

- DATABASE_URL — PostgreSQL connection string
- MAPBOX_ACCESS_TOKEN — Mapbox API access token
- MEILISEARCH_API_KEY — Meilisearch API key
- S3_BUCKET — S3 bucket for restaurant and review photos
