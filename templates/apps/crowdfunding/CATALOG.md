# Crowdfunding

- **slug**: `crowdfunding`
- **cluster**: operations-iot
- **type**: full-stack
- **layout**: dashboard

Kickstarter-like crowdfunding platform with campaigns, reward tiers, progress tracking, and backer updates

> **This is a complete, working app, already built.** The data model, handlers, and screens below all exist on disk (paths shown). Treat this as the user's existing codebase: **adapt the listed files in place** for the request; do not recreate tables, handlers, or pages that already exist, and do not add packages for functionality already implemented here.

## Features

`auth`, `search`, `payments`, `uploads`, `email-notifications`, `image-processing`

## Data model (7 domain tables)

_Already created by the existing SQL in `api/migrations/` — do NOT add new migrations for these tables._

- **campaign_updates** — id, campaign_id, author_id, title, body, backers_only, created_at, updated_at
- **campaigns** — id, creator_id, title, description, goal_amount, raised_amount, start_date, end_date, status, category, cover_image_url, featured, …
- **comments** — id, resourceType, resourceId, userId, parentId, body, editedAt, createdAt, updatedAt
- **devices** — id, createdAt, updatedAt, userId, name, pushPlatform, pushSubscription, hasPushSubscription
- **payments** — id, createdAt, updatedAt, userId, transactionId, productId, platformKey, data, receipt
- **pledges** — id, campaign_id, tier_id, backer_id, amount, status, payment_id, created_at, updated_at
- **reward_tiers** — id, campaign_id, title, description, amount, max_backers, current_backers, estimated_delivery, created_at, updated_at

## API surface (handlers)

_These endpoints already exist — open and extend the named file, never recreate it._

- **\_decorate** — `api/src/handlers/_decorate.ts`
- **\_seed** — `api/src/handlers/_seed.ts`
- **campaigns** — `api/src/handlers/campaigns.ts`
- **notifications** — `api/src/handlers/notifications.ts`
- **pledges** — `api/src/handlers/pledges.ts`
- **profiles** — `api/src/handlers/profiles.ts`
- **tiers** — `api/src/handlers/tiers.ts`
- **updates** — `api/src/handlers/updates.ts`

## Screens (16)

_These pages already exist — edit the named file in place, never create a parallel one._

- **Landing** `/` → `app/src/pages/Landing.tsx`
- **Login** `/login` → `app/src/pages/Login.tsx`
- **Signup** `/signup` → `app/src/pages/Signup.tsx`
- **ForgotPassword** `/forgot-password` → `app/src/pages/ForgotPassword.tsx`
- **ResetPassword** `/reset-password` → `app/src/pages/ResetPassword.tsx`
- **Discover** `/discover` (auth) → `app/src/pages/Discover.tsx`
- **CampaignDetail** `/campaign/:id` (auth) → `app/src/pages/CampaignDetail.tsx`
- **Dashboard** `/dashboard` (auth) → `app/src/pages/Dashboard.tsx`
- **CampaignEditor** `/campaign/new` (auth) → `app/src/pages/CampaignEditor.tsx`
- **Backers** `/backers` (auth) → `app/src/pages/Backers.tsx`
- **Settings** `/settings` (auth) → `app/src/pages/Settings.tsx`
- **MyPledges** `/my-pledges` (auth) → `app/src/pages/MyPledges.tsx`
- **Profile** `/profile/:userId` (auth) → `app/src/pages/Profile.tsx`
- **Notifications** `/notifications` (auth) → `app/src/pages/Notifications.tsx`
- **PledgeCheckout** `/campaign/:id/pledge` (auth) → `app/src/pages/PledgeCheckout.tsx`
- **CampaignManage** `/campaign/:id/manage` (auth) → `app/src/pages/CampaignManage.tsx`

## Subscription tiers

free / pro / team — gated by: maxCampaigns, maxPledges, maxTiers, maxUpdates, advancedFeatures, canExport, retentionDays

## Integrations (14 @molecule/* packages)

- **Database**: `@molecule/api-database-postgresql`
- **Domain resources**: `@molecule/api-resource-user`, `@molecule/api-resource-comment`
- **Email**: `@molecule/api-emails-mailgun`
- **Frontend / UI**: `@molecule/app-data-table`, `@molecule/app-virtual-scroll`, `@molecule/app-charts`, `@molecule/app-file-upload`, `@molecule/app-markdown`, `@molecule/app-command-palette`
- **Payments & billing**: `@molecule/api-payments-stripe`
- **Search**: `@molecule/api-search-meilisearch`
- **Uploads & media**: `@molecule/api-uploads-s3`, `@molecule/api-image-sharp`

## Required secrets

- DATABASE_URL — PostgreSQL connection string
- STRIPE_SECRET_KEY — Stripe secret key for payment processing
- STRIPE_PUBLISHABLE_KEY — Stripe publishable key for client-side
- STRIPE_WEBHOOK_SECRET — Stripe webhook signing secret
- AWS_ACCESS_KEY_ID — AWS access key for S3 uploads
- AWS_SECRET_ACCESS_KEY — AWS secret key for S3 uploads
- AWS_S3_BUCKET — S3 bucket for campaign images and assets
- MEILISEARCH_API_KEY — MeiliSearch API key
- MAILGUN_API_KEY — Mailgun API key for backer notifications
- MAILGUN_DOMAIN — Mailgun sending domain
