# Password Manager

- **slug**: `password-manager`
- **cluster**: productivity
- **type**: full-stack
- **layout**: dashboard

1Password-like vault with encrypted credentials, password generator, and sharing

> **This is a complete, working app, already built.** The data model, handlers, and screens below all exist on disk (paths shown). Treat this as the user's existing codebase: **adapt the listed files in place** for the request; do not recreate tables, handlers, or pages that already exist, and do not add packages for functionality already implemented here.

## Features

`auth`, `search`, `encryption`, `password-generator`, `sharing`

## Data model (10 domain tables)

_Already created by the existing SQL in `api/migrations/` — do NOT add new migrations for these tables._

- **devices** — id, createdAt, updatedAt, userId, name, pushPlatform, pushSubscription, hasPushSubscription
- **password_history** — id, item_id, user_id, encrypted_password, created_at, updatedAt
- **resource_tags** — id, tagId, resourceType, resourceId, createdAt
- **security_findings** — id, owner_id, user_id, item_id, kind, severity, detected_at, dismissed, updatedAt
- **tags** — id, name, slug, color, description, createdAt, updatedAt
- **two_factor_setups** — id, user_id, method, secret_or_credentials, verified_at, created_at, updated_at, updatedAt
- **vault_items** — id, vault_id, owner_id, user_id, name, type, username, url, encrypted_password, encrypted_notes, icon, folder, …
- **vault_recovery_keys** — id, user_id, public_key, encrypted_recovery_data, created_at, updatedAt
- **vault_shares** — id, vault_id, shared_by, shared_with_user_id, user_id, permission, created_at, accepted_at, updatedAt
- **vaults** — id, owner_id, user_id, name, description, icon, created_at, updated_at, updatedAt

## API surface (handlers)

_These endpoints already exist — open and extend the named file, never recreate it._

- **generator** — `api/src/handlers/generator.ts`
- **items** — `api/src/handlers/items.ts`
- **password-history** — `api/src/handlers/password-history.ts`
- **recovery-keys** — `api/src/handlers/recovery-keys.ts`
- **security** — `api/src/handlers/security.ts`
- **shares** — `api/src/handlers/shares.ts`
- **two-factor** — `api/src/handlers/two-factor.ts`
- **vaults** — `api/src/handlers/vaults.ts`

## Screens (16)

_These pages already exist — edit the named file in place, never create a parallel one._

- **Landing** `/` → `app/src/pages/Landing.tsx`
- **Login** `/login` → `app/src/pages/Login.tsx`
- **Signup** `/signup` → `app/src/pages/Signup.tsx`
- **ForgotPassword** `/forgot-password` → `app/src/pages/ForgotPassword.tsx`
- **ResetPassword** `/reset-password` → `app/src/pages/ResetPassword.tsx`
- **Vault** `/vault` (auth) → `app/src/pages/Vault.tsx`
- **ItemDetail** `/vault/:id` (auth) → `app/src/pages/ItemDetail.tsx`
- **NewItem** `/vault/new` (auth) → `app/src/pages/NewItem.tsx`
- **Generator** `/generator` (auth) → `app/src/pages/Generator.tsx`
- **SharedVaults** `/shared` (auth) → `app/src/pages/SharedVaults.tsx`
- **SecurityReport** `/security` (auth) → `app/src/pages/SecurityReport.tsx`
- **Settings** `/settings` (auth) → `app/src/pages/Settings.tsx`
- **Notifications** `/notifications` (auth) → `app/src/pages/Notifications.tsx`
- **Trash** `/trash` (auth) → `app/src/pages/Trash.tsx`
- **Profile** `/profile` (auth) → `app/src/pages/Profile.tsx`
- **SharedVaultDetail** `/shared/:id` (auth) → `app/src/pages/SharedVaultDetail.tsx`

## Subscription tiers

free / pro / team — gated by: maxGenerator, maxItems, maxVaults, advancedFeatures, canExport, retentionDays

## Integrations (9 @molecule/* packages)

- **Database**: `@molecule/api-database-postgresql`
- **Domain resources**: `@molecule/api-resource-user`, `@molecule/api-resource-tag`
- **Frontend / UI**: `@molecule/app-keyboard-shortcuts-hotkeys`, `@molecule/app-command-palette-cmdk`, `@molecule/app-virtual-scroll-tanstack`
- **Other API**: `@molecule/api-encryption-aes`, `@molecule/api-password-bcrypt`
- **Search**: `@molecule/api-search-postgres`

## Required secrets

- DATABASE_URL — PostgreSQL connection string
- ENCRYPTION_KEY — Master encryption key for vault data
