# Clipboard Manager

- **slug**: `clipboard-manager`
- **cluster**: productivity
- **type**: full-stack
- **layout**: dashboard

Paste-like clipboard history with search, categories, encrypted snippets, and keyboard-driven workflow

> **This is a complete, working app, already built.** The data model, handlers, and screens below all exist on disk (paths shown). Treat this as the user's existing codebase: **adapt the listed files in place** for the request; do not recreate tables, handlers, or pages that already exist, and do not add packages for functionality already implemented here.

## Features

`auth`, `search`, `encryption`, `categories`, `keyboard-shortcuts`

## Data model (6 domain tables)

_Already created by the existing SQL in `api/migrations/` — do NOT add new migrations for these tables._

- **categories** — id, owner_id, name, icon, color, position, created_at, updated_at
- **clips** — id, owner_id, category_id, title, content, encrypted_content, type, source_app, is_pinned, is_favorite, is_sensitive, created_at, …
- **devices** — id, createdAt, updatedAt, userId, name, pushPlatform, pushSubscription, hasPushSubscription
- **payments** — id, createdAt, updatedAt, userId, transactionId, productId, platformKey, data, receipt
- **resource_tags** — id, tagId, resourceType, resourceId, createdAt
- **tags** — id, name, slug, color, description, createdAt, updatedAt

## API surface (handlers)

_These endpoints already exist — open and extend the named file, never recreate it._

- **\_debug** — `api/src/handlers/_debug.ts`
- **categories** — `api/src/handlers/categories.ts`
- **clips** — `api/src/handlers/clips.ts`
- **devices** — `api/src/handlers/devices.ts`
- **pinned** — `api/src/handlers/pinned.ts`
- **profile** — `api/src/handlers/profile.ts`

## Screens (12)

_These pages already exist — edit the named file in place, never create a parallel one._

- **Landing** `/` → `app/src/pages/Landing.tsx`
- **Login** `/login` → `app/src/pages/Login.tsx`
- **Signup** `/signup` → `app/src/pages/Signup.tsx`
- **ForgotPassword** `/forgot-password` → `app/src/pages/ForgotPassword.tsx`
- **ResetPassword** `/reset-password` → `app/src/pages/ResetPassword.tsx`
- **Clips** `/clips` (auth) → `app/src/pages/Clips.tsx`
- **CommandPalette** `/command-palette` (auth) → `app/src/pages/CommandPalette.tsx`
- **Categories** `/categories` (auth) → `app/src/pages/Categories.tsx`
- **Devices** `/devices` (auth) → `app/src/pages/Devices.tsx`
- **Settings** `/settings` (auth) → `app/src/pages/Settings.tsx`
- **Profile** `/profile` (auth) → `app/src/pages/Profile.tsx`
- **Billing** `/billing` (auth) → `app/src/pages/Billing.tsx`

## Subscription tiers

free / pro / team — gated by: maxCategories, maxClips, maxPinned, advancedFeatures, canExport, retentionDays

## Integrations (8 @molecule/* packages)

- **Database**: `@molecule/api-database-postgresql`
- **Domain resources**: `@molecule/api-resource-user`, `@molecule/api-resource-tag`
- **Frontend / UI**: `@molecule/app-virtual-scroll-tanstack`, `@molecule/app-keyboard-shortcuts-hotkeys`, `@molecule/app-command-palette-cmdk`
- **Other API**: `@molecule/api-encryption-aes`
- **Search**: `@molecule/api-search-meilisearch`

## Required secrets

- DATABASE_URL — PostgreSQL connection string
- MEILISEARCH_API_KEY — MeiliSearch API key
- ENCRYPTION_KEY — Encryption key for sensitive clips
