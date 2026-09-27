# API Testing Tool

- **slug**: `api-testing-tool`
- **cluster**: developer-tools
- **type**: full-stack
- **layout**: dashboard

Postman-like API testing with requests, collections, environments, and history

> **This is a complete, working app, already built.** The data model, handlers, and screens below all exist on disk (paths shown). Treat this as the user's existing codebase: **adapt the listed files in place** for the request; do not recreate tables, handlers, or pages that already exist, and do not add packages for functionality already implemented here.

## Features

`auth`, `search`, `keyboard-shortcuts`

## Data model (11 domain tables)

_Already created by the existing SQL in `api/migrations/` — do NOT add new migrations for these tables._

- **collections** — id, user_id, name, description, sort_order, created_at, updated_at
- **devices** — id, createdAt, updatedAt, userId, name, pushPlatform, pushSubscription, hasPushSubscription
- **environments** — id, user_id, name, variables, is_active, created_at, updated_at
- **history** — id, user_id, request_id, method, url, status_code, response_headers, response_body, duration_ms, error, created_at
- **mocks** — id, user_id, name, path_pattern, method, response_status, response_headers, response_body, latency_ms, is_public, public_token, created_at, …
- **monitors** — id, user_id, test_id, name, cron_schedule, is_active, last_run_at, last_status, success_rate_24h, p95_latency_ms, created_at, updated_at
- **payments** — id, createdAt, updatedAt, userId, transactionId, productId, platformKey, data, receipt
- **requests** — id, user_id, collection_id, name, method, url, headers, query_params, body_type, body_content, auth_type, auth_config, …
- **resource_tags** — id, tagId, resourceType, resourceId, createdAt
- **tags** — id, name, slug, color, description, createdAt, updatedAt
- **tests** — id, user_id, request_id, name, assertions, last_run_at, last_status, created_at, updated_at, last_results

## API surface (handlers)

_These endpoints already exist — open and extend the named file, never recreate it._

- **collections** — `api/src/handlers/collections.ts`
- **environments** — `api/src/handlers/environments.ts`
- **history** — `api/src/handlers/history.ts`
- **mocks** — `api/src/handlers/mocks.ts`
- **monitors** — `api/src/handlers/monitors.ts`
- **requests** — `api/src/handlers/requests.ts`
- **tests** — `api/src/handlers/tests.ts`

## Screens (14)

_These pages already exist — edit the named file in place, never create a parallel one._

- **Landing** `/` → `app/src/pages/Landing.tsx`
- **Login** `/login` → `app/src/pages/Login.tsx`
- **Signup** `/signup` → `app/src/pages/Signup.tsx`
- **ForgotPassword** `/forgot-password` → `app/src/pages/ForgotPassword.tsx`
- **ResetPassword** `/reset-password` → `app/src/pages/ResetPassword.tsx`
- **Workspace** `/workspace` (auth) → `app/src/pages/Workspace.tsx`
- **Collections** `/collections` (auth) → `app/src/pages/Collections.tsx`
- **Environments** `/environments` (auth) → `app/src/pages/Environments.tsx`
- **History** `/history` (auth) → `app/src/pages/History.tsx`
- **Mocks** `/mocks` (auth) → `app/src/pages/Mocks.tsx`
- **Settings** `/settings` (auth) → `app/src/pages/Settings.tsx`
- **TestRunner** `/tests` (auth) → `app/src/pages/TestRunner.tsx`
- **Monitors** `/monitors` (auth) → `app/src/pages/Monitors.tsx`
- **Profile** `/profile` (auth) → `app/src/pages/Profile.tsx`

## Subscription tiers

free / pro / team — gated by: maxCollections, maxEnvironments, maxHistory, maxRequests, advancedFeatures, canExport, retentionDays

## Integrations (13 @molecule/* packages)

- **Database**: `@molecule/api-database-postgresql`
- **Domain resources**: `@molecule/api-resource-user`, `@molecule/api-resource-tag`
- **Frontend / UI**: `@molecule/app-code-editor-monaco`, `@molecule/app-data-table`, `@molecule/app-command-palette`, `@molecule/app-keyboard-shortcuts`, `@molecule/app-tree-view`, `@molecule/app-virtual-scroll`
- **Other API**: `@molecule/api-http-fetch`, `@molecule/api-encryption-aes`, `@molecule/api-import-export-csv`
- **Search**: `@molecule/api-search-meilisearch`

## Required secrets

- DATABASE_URL — PostgreSQL connection string
