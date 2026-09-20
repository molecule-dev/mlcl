# Feedback & Roadmap

- **slug**: `feedback-roadmap`
- **cluster**: business-saas
- **type**: full-stack
- **layout**: dashboard

Canny-like feedback boards with voting, official statuses, a public roadmap, and a changelog — with built-in Stripe-backed subscription tiers

> **This is a complete, working app, already built.** The data model, handlers, and screens below all exist on disk (paths shown). Treat this as the user's existing codebase: **adapt the listed files in place** for the request; do not recreate tables, handlers, or pages that already exist, and do not add packages for functionality already implemented here.

## Features

`auth`, `search`, `voting`, `boards`, `roadmap`, `changelog`, `admin-workflow`, `subscriptions`

## Data model (6 domain tables)

_Already created by the existing SQL in `api/migrations/` — do NOT add new migrations for these tables._

- **devices** — id, createdAt, updatedAt, userId, name, pushPlatform, pushSubscription, hasPushSubscription
- **feedback_boards** — id, slug, name, description, color, icon, sort_order, created_at, updated_at
- **feedback_posts** — id, slug, title, body, board_id, author_id, user_id, status, admin_response, admin_responded_at, merged_into_id, vote_count, …
- **feedback_votes** — id, post_id, user_id, created_at, updated_at
- **feedback_comments** — id, post_id, author_id, user_id, body, edited_at, created_at, updated_at
- **payments** — id, createdAt, updatedAt, userId, transactionId, productId, platformKey, data, receipt

## API surface (handlers)

_These endpoints already exist — open and extend the named file, never recreate it._

- **\_seed** — `api/src/handlers/_seed.ts`
- **\_test** — `api/src/handlers/_test.ts`
- **admin** — `api/src/handlers/admin.ts`
- **boards** — `api/src/handlers/boards.ts`
- **posts** — `api/src/handlers/posts.ts`
- **votes** — `api/src/handlers/votes.ts`

## Screens (22)

_These pages already exist — edit the named file in place, never create a parallel one._

- **Landing** `/` → `app/src/pages/Landing.tsx`
- **Login** `/login` → `app/src/pages/Login.tsx`
- **Signup** `/signup` → `app/src/pages/Signup.tsx`
- **ForgotPassword** `/forgot-password` → `app/src/pages/ForgotPassword.tsx`
- **ResetPassword** `/reset-password` → `app/src/pages/ResetPassword.tsx`
- **Boards** `/boards` → `app/src/pages/Boards.tsx`
- **BoardDetail** `/b/:slug` → `app/src/pages/BoardDetail.tsx`
- **PostDetail** `/post/:id` → `app/src/pages/PostDetail.tsx`
- **Roadmap** `/roadmap` → `app/src/pages/Roadmap.tsx`
- **Changelog** `/changelog` → `app/src/pages/Changelog.tsx`
- **Search** `/search` → `app/src/pages/Search.tsx`
- **SubmitPost** `/submit` (auth) → `app/src/pages/SubmitPost.tsx`
- **MyActivity** `/my-activity` (auth) → `app/src/pages/MyActivity.tsx`
- **AdminDashboard** `/admin` (auth) → `app/src/pages/AdminDashboard.tsx`
- **PostsAdmin** `/admin/posts` (auth) → `app/src/pages/PostsAdmin.tsx`
- **Settings** `/settings` (auth) → `app/src/pages/Settings.tsx`
- **Pricing** `/pricing` → `app/src/pages/Pricing.tsx`
- **About** `/about` → `app/src/pages/About.tsx`
- **Terms** `/terms` → `app/src/pages/Terms.tsx`
- **Privacy** `/privacy` → `app/src/pages/Privacy.tsx`
- **PlanUpdated** `/plan-updated` → `app/src/pages/PlanUpdated.tsx`
- **NotFound** `/*` → `app/src/pages/NotFound.tsx`

## Subscription tiers

free / pro / team — gated by: maxBoards, maxPosts, maxVotes, advancedFeatures, canExport, retentionDays

## Integrations (10 @molecule/* packages)

- **Auth & permissions**: `@molecule/api-permissions-custom`
- **Database**: `@molecule/api-database-postgresql`
- **Domain resources**: `@molecule/api-resource-user`, `@molecule/api-resource-payment`
- **Email**: `@molecule/api-email-templates`, `@molecule/api-emails-mailgun`
- **Payments & billing**: `@molecule/api-payments-stripe`, `@molecule/api-entitlements`, `@molecule/app-billing-react`
- **Search**: `@molecule/api-search-meilisearch`

## Required secrets

- DATABASE_URL — PostgreSQL connection string
- MEILISEARCH_API_KEY — MeiliSearch API key
- STRIPE_SECRET_KEY — Stripe secret API key (sk_test_... in test mode)
- STRIPE_WEBHOOK_SECRET — Stripe webhook signing secret (whsec_...)
