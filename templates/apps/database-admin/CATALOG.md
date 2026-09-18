# Database Admin

- **slug**: `database-admin`
- **cluster**: developer-tools
- **type**: full-stack
- **layout**: dashboard

pgAdmin-like database manager with schema browser, query runner, and data visualization

> **This is a complete, working app, already built.** The data model, handlers, and screens below all exist on disk (paths shown). Treat this as the user's existing codebase: **adapt the listed files in place** for the request; do not recreate tables, handlers, or pages that already exist, and do not add packages for functionality already implemented here.

## Features

`auth`, `search`, `keyboard-shortcuts`

## Data model (6 domain tables)

_Already created by the existing SQL in `api/migrations/` — do NOT add new migrations for these tables._

- **audit_log** — id, user_id, connection_id, action, target, metadata, created_at
- **connections** — id, user_id, name, host, port, database_name, username, connection_string, ssl, color, driver, created_at, …
- **devices** — id, createdAt, updatedAt, userId, name, pushPlatform, pushSubscription, hasPushSubscription
- **payments** — id, createdAt, updatedAt, userId, transactionId, productId, platformKey, data, receipt
- **query_history** — id, user_id, connection_id, sql, status, row_count, duration_ms, error_message, created_at
- **saved_queries** — id, user_id, connection_id, name, sql, description, created_at, updated_at

## API surface (handlers)

_These endpoints already exist — open and extend the named file, never recreate it._

- **connections** — `api/src/handlers/connections.ts`
- **queries** — `api/src/handlers/queries.ts`
- **schema** — `api/src/handlers/schema.ts`

## Screens (14)

_These pages already exist — edit the named file in place, never create a parallel one._

- **Login** `/login` → `app/src/pages/Login.tsx`
- **Signup** `/signup` → `app/src/pages/Signup.tsx`
- **ForgotPassword** `/forgot-password` → `app/src/pages/ForgotPassword.tsx`
- **ResetPassword** `/reset-password` → `app/src/pages/ResetPassword.tsx`
- **Connections** `/connections` (auth) → `app/src/pages/Connections.tsx`
- **QueryEditor** `/query/:connectionId` (auth) → `app/src/pages/QueryEditor.tsx`
- **TableBrowser** `/table/:connectionId/:table` (auth) → `app/src/pages/TableBrowser.tsx`
- **SchemaExplorer** `/schema/:connectionId` (auth) → `app/src/pages/SchemaExplorer.tsx`
- **QueryHistory** `/history` (auth) → `app/src/pages/QueryHistory.tsx`
- **Monitoring** `/monitoring` (auth) → `app/src/pages/Monitoring.tsx`
- **Settings** `/settings` (auth) → `app/src/pages/Settings.tsx`
- **NewConnection** `/connections/new` (auth) → `app/src/pages/NewConnection.tsx`
- **EditConnection** `/connections/:connectionId/edit` (auth) → `app/src/pages/EditConnection.tsx`
- **SavedQueryDetail** `/history/saved/:queryId` (auth) → `app/src/pages/SavedQueryDetail.tsx`

## Subscription tiers

free / pro / team — gated by: maxConnections, maxQueries, maxSchema, advancedFeatures, canExport, retentionDays

## Integrations (21 @molecule/* packages)

- **Database**: `@molecule/api-database-postgresql`, `@molecule/api-database-remote`
- **Domain resources**: `@molecule/api-resource-user`, `@molecule/api-resource-payment`
- **Email**: `@molecule/api-email-templates`, `@molecule/api-emails-mailgun`
- **Frontend / UI**: `@molecule/app-code-editor-monaco`, `@molecule/app-data-table`, `@molecule/app-tree-view`, `@molecule/app-virtual-scroll`, `@molecule/app-command-palette`, `@molecule/app-keyboard-shortcuts`, `@molecule/app-charts`
- **Other API**: `@molecule/api-middleware-validation`, `@molecule/api-encryption-aes`, `@molecule/api-import-export-csv`, `@molecule/api-audit-database`
- **Payments & billing**: `@molecule/api-payments-stripe`, `@molecule/api-entitlements`, `@molecule/app-billing-react`
- **Search**: `@molecule/api-search-meilisearch`

## Required secrets

- DATABASE_URL — PostgreSQL connection string
- ENCRYPTION_KEY — Master encryption key for stored database connection credentials
