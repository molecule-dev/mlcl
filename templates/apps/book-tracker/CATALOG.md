# Book Tracker

- **slug**: `book-tracker`
- **cluster**: content-social
- **type**: full-stack
- **layout**: dashboard

Goodreads-like reading tracker with shelves, book logging, reviews, ratings, reading challenges, and yearly stats — with built-in Stripe-backed subscription tiers

> **This is a complete, working app, already built.** The data model, handlers, and screens below all exist on disk (paths shown). Treat this as the user's existing codebase: **adapt the listed files in place** for the request; do not recreate tables, handlers, or pages that already exist, and do not add packages for functionality already implemented here.

## Features

`auth`, `notifications`, `shelves`, `reading-challenge`, `reviews`, `statistics`, `subscriptions`

## Data model (8 domain tables)

_Already created by the existing SQL in `api/migrations/` — do NOT add new migrations for these tables._

- **books** — id, user_id, title, author, page_count, genres, cover_style, description, created_at, updated_at
- **user_books** — id, user_id, book_id, shelf, current_page, started_at, finished_at, rating, review, created_at, updated_at
- **reading_sessions** — id, user_book_id, user_id, date, minutes, pages_read, note, created_at, updated_at
- **reading_challenges** — id, user_id, year, goal_books, created_at, updated_at
- **notifications** — id, user_id, type, title, body, href, read, created_at
- **devices** — id, createdAt, updatedAt, userId, name, pushPlatform, pushSubscription, hasPushSubscription
- **tags** — id, name, slug, color, description, createdAt, updatedAt
- **resource_tags** — id, tagId, resourceType, resourceId, createdAt

## API surface (handlers)

_These endpoints already exist — open and extend the named file, never recreate it._

- **\_reading** — `api/src/handlers/_reading.ts`
- **books** — `api/src/handlers/books.ts`
- **challenge** — `api/src/handlers/challenge.ts`
- **notifications** — `api/src/handlers/notifications.ts`
- **profile** — `api/src/handlers/profile.ts`
- **reports** — `api/src/handlers/reports.ts`
- **reviews** — `api/src/handlers/reviews.ts`
- **sessions** — `api/src/handlers/sessions.ts`
- **stats** — `api/src/handlers/stats.ts`

## Screens (15)

_These pages already exist — edit the named file in place, never create a parallel one._

- **Landing** `/` → `app/src/pages/Landing.tsx`
- **Login** `/login` → `app/src/pages/Login.tsx`
- **Signup** `/signup` → `app/src/pages/Signup.tsx`
- **ForgotPassword** `/forgot-password` → `app/src/pages/ForgotPassword.tsx`
- **ResetPassword** `/reset-password` → `app/src/pages/ResetPassword.tsx`
- **Dashboard** `/dashboard` (auth) → `app/src/pages/Dashboard.tsx`
- **Books** `/books` (auth) → `app/src/pages/Books.tsx`
- **BookDetail** `/books/:id` (auth) → `app/src/pages/BookDetail.tsx`
- **AddBook** `/books/new` (auth) → `app/src/pages/AddBook.tsx`
- **Challenge** `/challenge` (auth) → `app/src/pages/Challenge.tsx`
- **Reviews** `/reviews` (auth) → `app/src/pages/Reviews.tsx`
- **Stats** `/stats` (auth) → `app/src/pages/Stats.tsx`
- **Notifications** `/notifications` (auth) → `app/src/pages/Notifications.tsx`
- **Settings** `/settings` (auth) → `app/src/pages/Settings.tsx`
- **Profile** `/profile` (auth) → `app/src/pages/Profile.tsx`

## Subscription tiers

free / pro / team — gated by: maxBooks, maxReviews, advancedFeatures, canExport, retentionDays

## Integrations (16 @molecule/* packages)

- **Database**: `@molecule/api-database-postgresql`
- **Domain resources**: `@molecule/api-resource-user`, `@molecule/api-resource-tag`, `@molecule/api-resource-payment`
- **Email**: `@molecule/api-email-templates`, `@molecule/api-emails-mailgun`
- **Frontend / UI**: `@molecule/app-keyboard-shortcuts-hotkeys`, `@molecule/app-command-palette-cmdk`, `@molecule/app-sidebar-layout-react`, `@molecule/app-notification-feed-react`
- **Notifications**: `@molecule/api-push-notifications-web-push`
- **Other API**: `@molecule/api-cron-node-cron`, `@molecule/api-reporting-database`
- **Payments & billing**: `@molecule/api-payments-stripe`, `@molecule/api-entitlements`, `@molecule/app-billing-react`

## Required secrets

- DATABASE_URL — PostgreSQL connection string
- VAPID_PUBLIC_KEY — VAPID public key for push notifications
- VAPID_PRIVATE_KEY — VAPID private key for push notifications
- STRIPE_SECRET_KEY — Stripe secret API key (sk_test_... in test mode)
- STRIPE_WEBHOOK_SECRET — Stripe webhook signing secret (whsec_...)
