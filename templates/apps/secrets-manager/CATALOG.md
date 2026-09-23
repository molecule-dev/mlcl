# Secrets Manager

- **slug**: `secrets-manager`
- **cluster**: developer-tools
- **type**: full-stack
- **layout**: dashboard

Vault-like secrets management with encrypted key-value storage, rotation policies, and access control

> **This is a complete, working app, already built.** The data model, handlers, and screens below all exist on disk (paths shown). Treat this as the user's existing codebase: **adapt the listed files in place** for the request; do not recreate tables, handlers, or pages that already exist, and do not add packages for functionality already implemented here.

## Features

`auth`, `search`

## Data model (11 domain tables)

_Already created by the existing SQL in `api/migrations/` — do NOT add new migrations for these tables._

- **access_policies** — id, user_id, vault_id, name, path_pattern, permissions, allowed_environments, expires_at, created_at, updated_at, updatedAt
- **api_tokens** — id, user_id, name, token_hash, scopes, expires_at, last_used_at, revoked_at, created_at, updatedAt
- **audit_log** — id, actor, action, resource, resource_id, details, ip, user_agent, timestamp, created_at, updatedAt
- **devices** — id, createdAt, updatedAt, userId, name, pushPlatform, pushSubscription, hasPushSubscription
- **integrations** — id, user_id, name, category, config, status, last_sync, created_at, updated_at, updatedAt
- **notifications** — id, user_id, kind, title, body, read_at, data, created_at, updatedAt
- **rotations** — id, user_id, secret_id, scheduled_at, completed_at, status, by_actor, mode, created_at, updatedAt
- **secret_versions** — id, user_id, secret_id, version, value, comment, created_by, created_at, updatedAt
- **secrets** — id, user_id, vault_id, name, key, path, kind, value, version, environment, status, owners, …
- **team_members** — id, user_id, member_id, email, role, status, sso_group, vaults, last_active_at, created_at, updated_at, updatedAt
- **vaults** — id, user_id, slug, name, description, environment, color, compliance, members_count, secrets_count, next_rotation, created_at, …

## API surface (handlers)

_These endpoints already exist — open and extend the named file, never recreate it._

- **access-policies** — `api/src/handlers/access-policies.ts`
- **api-tokens** — `api/src/handlers/api-tokens.ts`
- **audit-log** — `api/src/handlers/audit-log.ts`
- **integrations** — `api/src/handlers/integrations.ts`
- **notifications** — `api/src/handlers/notifications.ts`
- **rotations** — `api/src/handlers/rotations.ts`
- **secrets** — `api/src/handlers/secrets.ts`
- **settings** — `api/src/handlers/settings.ts`
- **team-members** — `api/src/handlers/team-members.ts`
- **vaults** — `api/src/handlers/vaults.ts`

## Screens (16)

_These pages already exist — edit the named file in place, never create a parallel one._

- **Landing** `/` → `app/src/pages/Landing.tsx`
- **Login** `/login` → `app/src/pages/Login.tsx`
- **Signup** `/signup` → `app/src/pages/Signup.tsx`
- **ForgotPassword** `/forgot-password` → `app/src/pages/ForgotPassword.tsx`
- **ResetPassword** `/reset-password` → `app/src/pages/ResetPassword.tsx`
- **Vaults** `/vaults` (auth) → `app/src/pages/Vaults.tsx`
- **VaultDetail** `/vaults/:id` (auth) → `app/src/pages/VaultDetail.tsx`
- **SecretDetail** `/secrets/:id` (auth) → `app/src/pages/SecretDetail.tsx`
- **AuditLog** `/audit` (auth) → `app/src/pages/AuditLog.tsx`
- **Settings** `/settings` (auth) → `app/src/pages/Settings.tsx`
- **Rotations** `/rotations` (auth) → `app/src/pages/Rotations.tsx`
- **Integrations** `/integrations` (auth) → `app/src/pages/Integrations.tsx`
- **Team** `/team` (auth) → `app/src/pages/Team.tsx`
- **ApiTokens** `/tokens` (auth) → `app/src/pages/ApiTokens.tsx`
- **Notifications** `/notifications` (auth) → `app/src/pages/Notifications.tsx`
- **Profile** `/profile` (auth) → `app/src/pages/Profile.tsx`

## Subscription tiers

free / pro / team — gated by: maxAccessPolicies, maxAuditLog, maxSecrets, advancedFeatures, canExport, retentionDays

## Integrations (11 @molecule/* packages)

- **Auth & permissions**: `@molecule/api-permissions-custom`
- **Database**: `@molecule/api-database-postgresql`
- **Domain resources**: `@molecule/api-resource-user`
- **Frontend / UI**: `@molecule/app-data-table`, `@molecule/app-command-palette`, `@molecule/app-keyboard-shortcuts`, `@molecule/app-virtual-scroll`
- **Other API**: `@molecule/api-encryption-aes`, `@molecule/api-audit-database`, `@molecule/api-cron-node-cron`
- **Search**: `@molecule/api-search-meilisearch`

## Required secrets

- DATABASE_URL — PostgreSQL connection string
- ENCRYPTION_KEY — Master encryption key for secrets
