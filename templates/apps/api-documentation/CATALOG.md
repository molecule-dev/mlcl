# API Documentation

- **slug**: `api-documentation`
- **cluster**: developer-tools
- **type**: full-stack
- **layout**: dashboard

Swagger-like API documentation with OpenAPI spec, try-it console, and code samples

> **This is a complete, working app, already built.** The data model, handlers, and screens below all exist on disk (paths shown). Treat this as the user's existing codebase: **adapt the listed files in place** for the request; do not recreate tables, handlers, or pages that already exist, and do not add packages for functionality already implemented here.

## Features

`auth`, `search`, `keyboard-shortcuts`

## Data model (13 domain tables)

_Already created by the existing SQL in `api/migrations/` — do NOT add new migrations for these tables._

- **api_endpoints** — id, spec_id, user_id, method, path, tag, summary, description, parameters, responses, samples, deprecated, …
- **api_errors** — id, code, status, description, troubleshooting, example_response, created_at
- **api_keys** — id, user_id, name, key_hash, key_masked, scopes, last_used_at, revoked_at, created_at
- **api_specs** — id, user_id, project_id, title, name, version, description, spec_content, openapi_json, base_url, is_public, is_published, …
- **changelog** — id, user_id, spec_id, version, released_at, entries, is_public, created_at
- **devices** — id, createdAt, updatedAt, userId, name, pushPlatform, pushSubscription, hasPushSubscription
- **notifications** — id, user_id, type, title, body, href, unread, created_at
- **payments** — id, createdAt, updatedAt, userId, transactionId, productId, platformKey, data, receipt
- **projects** — id, userId, name, slug, projectType, framework, packages, envVars, sandboxId, sandboxStatus, lastActiveAt, settings, …
- **sdks** — id, language, package_name, version, install_command, github_url, example, created_at
- **services** — id, name, status, description, url, created_at, updated_at
- **team_members** — id, team_id, user_id, email, role, invited_at, joined_at, created_at
- **try_it_history** — id, user_id, endpoint_id, method, url, request, status, response, duration_ms, created_at

## API surface (handlers)

_These endpoints already exist — open and extend the named file, never recreate it._

- **\_seed** — `api/src/handlers/_seed.ts`
- **api_errors** — `api/src/handlers/api_errors.ts`
- **api_keys** — `api/src/handlers/api_keys.ts`
- **billing** — `api/src/handlers/billing.ts`
- **changelog** — `api/src/handlers/changelog.ts`
- **endpoints** — `api/src/handlers/endpoints.ts`
- **guides** — `api/src/handlers/guides.ts`
- **integrations** — `api/src/handlers/integrations.ts`
- **notifications** — `api/src/handlers/notifications.ts`
- **profile** — `api/src/handlers/profile.ts`
- **reports** — `api/src/handlers/reports.ts`
- **sdks** — `api/src/handlers/sdks.ts`
- **specs** — `api/src/handlers/specs.ts`
- **team_members** — `api/src/handlers/team_members.ts`
- **try-it** — `api/src/handlers/try-it.ts`
- **webhooks** — `api/src/handlers/webhooks.ts`

## Screens (21)

_These pages already exist — edit the named file in place, never create a parallel one._

- **Landing** `/` → `app/src/pages/Landing.tsx`
- **Login** `/login` → `app/src/pages/Login.tsx`
- **Signup** `/signup` → `app/src/pages/Signup.tsx`
- **ForgotPassword** `/forgot-password` → `app/src/pages/ForgotPassword.tsx`
- **ResetPassword** `/reset-password` → `app/src/pages/ResetPassword.tsx`
- **DocsHome** `/docs` (auth) → `app/src/pages/DocsHome.tsx`
- **EndpointReference** `/docs/endpoints/:id` (auth) → `app/src/pages/EndpointReference.tsx`
- **Endpoints** `/docs/endpoints` (auth) → `app/src/pages/Endpoints.tsx`
- **Guides** `/docs/guides` (auth) → `app/src/pages/Guides.tsx`
- **APIKeys** `/settings/api-keys` (auth) → `app/src/pages/APIKeys.tsx`
- **Settings** `/settings` (auth) → `app/src/pages/Settings.tsx`
- **Changelog** `/docs/changelog` (auth) → `app/src/pages/Changelog.tsx`
- **Webhooks** `/docs/webhooks` (auth) → `app/src/pages/Webhooks.tsx`
- **SDKs** `/docs/sdks` (auth) → `app/src/pages/SDKs.tsx`
- **Errors** `/docs/errors` (auth) → `app/src/pages/Errors.tsx`
- **APIPlayground** `/playground` (auth) → `app/src/pages/APIPlayground.tsx`
- **Status** `/status` (auth) → `app/src/pages/Status.tsx`
- **Profile** `/profile` (auth) → `app/src/pages/Profile.tsx`
- **Billing** `/settings/billing` (auth) → `app/src/pages/Billing.tsx`
- **Team** `/settings/team` (auth) → `app/src/pages/Team.tsx`
- **NotFound** `/404` → `app/src/pages/NotFound.tsx`

## Subscription tiers

free / pro / team — gated by: maxEndpoints, maxSpecs, maxTryIt, advancedFeatures, canExport, retentionDays

## Integrations (12 @molecule/* packages)

- **Database**: `@molecule/api-database-postgresql`
- **Domain resources**: `@molecule/api-resource-user`, `@molecule/api-resource-project`
- **Frontend / UI**: `@molecule/app-code-editor-monaco`, `@molecule/app-data-table`, `@molecule/app-markdown`, `@molecule/app-tree-view`, `@molecule/app-command-palette`, `@molecule/app-keyboard-shortcuts`, `@molecule/app-virtual-scroll`
- **Other API**: `@molecule/api-http-fetch`
- **Search**: `@molecule/api-search-meilisearch`

## Required secrets

- DATABASE_URL — PostgreSQL connection string
