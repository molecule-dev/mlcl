# Spreadsheet

- **slug**: `spreadsheet`
- **cluster**: productivity
- **type**: full-stack
- **layout**: dashboard

Airtable-like spreadsheet with grid views, column types, formulas, real-time collaboration, and CSV import/export

> **This is a complete, working app, already built.** The data model, handlers, and screens below all exist on disk (paths shown). Treat this as the user's existing codebase: **adapt the listed files in place** for the request; do not recreate tables, handlers, or pages that already exist, and do not add packages for functionality already implemented here.

## Features

`auth`, `realtime`, `search`, `import-export`, `formulas`, `column-types`

## Data model (15 domain tables)

_Already created by the existing SQL in `api/migrations/` — do NOT add new migrations for these tables._

- **automations** — id, spreadsheet_id, owner_id, name, trigger, action, is_active, last_run_at, created_at, updated_at
- **chart_definitions** — id, sheet_id, spreadsheet_id, owner_id, name, type, config, created_at, updated_at
- **columns** — id, sheet_id, spreadsheet_id, owner_id, name, type, config, position, width_px, created_at, updated_at
- **devices** — id, createdAt, updatedAt, userId, name, pushPlatform, pushSubscription, hasPushSubscription
- **integration_connections** — id, user_id, owner_id, provider, status, tokens, created_at, updated_at
- **notifications** — id, user_id, type, title, body, data, read_at, created_at
- **payments** — id, createdAt, updatedAt, userId, transactionId, productId, platformKey, data, receipt
- **resource_tags** — id, tagId, resourceType, resourceId, createdAt
- **rows** — id, sheet_id, spreadsheet_id, owner_id, cells, position, created_at, updated_at
- **sheets** — id, spreadsheet_id, owner_id, name, position, color, created_at, updated_at
- **spreadsheet_collaborators** — id, spreadsheet_id, owner_id, user_id, email, role, invited_by, accepted_at, created_at, updated_at
- **spreadsheet_templates** — id, owner_id, name, description, category, is_system, snapshot, created_at, updated_at
- **spreadsheet_versions** — id, spreadsheet_id, owner_id, created_by, snapshot, change_summary, created_at
- **spreadsheets** — id, owner_id, user_id, title, description, is_public, public_slug, is_starred, trashed_at, created_at, updated_at
- **tags** — id, name, slug, color, description, createdAt, updatedAt

## API surface (handlers)

_These endpoints already exist — open and extend the named file, never recreate it._

- **automations** — `api/src/handlers/automations.ts`
- **charts** — `api/src/handlers/charts.ts`
- **collaborators** — `api/src/handlers/collaborators.ts`
- **columns** — `api/src/handlers/columns.ts`
- **import-export** — `api/src/handlers/import-export.ts`
- **integrations** — `api/src/handlers/integrations.ts`
- **notifications** — `api/src/handlers/notifications.ts`
- **rows** — `api/src/handlers/rows.ts`
- **search** — `api/src/handlers/search.ts`
- **sheets** — `api/src/handlers/sheets.ts`
- **spreadsheets** — `api/src/handlers/spreadsheets.ts`
- **templates** — `api/src/handlers/templates.ts`
- **versions** — `api/src/handlers/versions.ts`

## Screens (19)

_These pages already exist — edit the named file in place, never create a parallel one._

- **Landing** `/` → `app/src/pages/Landing.tsx`
- **Login** `/login` → `app/src/pages/Login.tsx`
- **Signup** `/signup` → `app/src/pages/Signup.tsx`
- **ForgotPassword** `/forgot-password` → `app/src/pages/ForgotPassword.tsx`
- **ResetPassword** `/reset-password` → `app/src/pages/ResetPassword.tsx`
- **Workbooks** `/workbooks` (auth) → `app/src/pages/Workbooks.tsx`
- **Editor** `/workbooks/:id` (auth) → `app/src/pages/Editor.tsx`
- **Charts** `/workbooks/:id/charts` (auth) → `app/src/pages/Charts.tsx`
- **Templates** `/templates` (auth) → `app/src/pages/Templates.tsx`
- **Settings** `/settings` (auth) → `app/src/pages/Settings.tsx`
- **TemplatePreview** `/templates/:id` (auth) → `app/src/pages/TemplatePreview.tsx`
- **Automations** `/automations` (auth) → `app/src/pages/Automations.tsx`
- **Integrations** `/integrations` (auth) → `app/src/pages/Integrations.tsx`
- **History** `/workbooks/:id/history` (auth) → `app/src/pages/History.tsx`
- **Notifications** `/notifications` (auth) → `app/src/pages/Notifications.tsx`
- **Team** `/team` (auth) → `app/src/pages/Team.tsx`
- **Profile** `/profile` (auth) → `app/src/pages/Profile.tsx`
- **Billing** `/billing` (auth) → `app/src/pages/Billing.tsx`
- **NotFound** `/*` → `app/src/pages/NotFound.tsx`

## Subscription tiers

free / pro / team — gated by: maxColumns, maxRows, maxSheets, maxSpreadsheets, advancedFeatures, canExport, retentionDays

## Integrations (11 @molecule/* packages)

- **Database**: `@molecule/api-database-postgresql`
- **Domain resources**: `@molecule/api-resource-user`, `@molecule/api-resource-tag`
- **Frontend / UI**: `@molecule/app-data-table`, `@molecule/app-virtual-scroll-tanstack`, `@molecule/app-keyboard-shortcuts-hotkeys`, `@molecule/app-command-palette-cmdk`
- **Other API**: `@molecule/api-import-export-csv`
- **Realtime**: `@molecule/api-realtime-socketio`, `@molecule/app-realtime-socketio`
- **Search**: `@molecule/api-search-meilisearch`

## Required secrets

- DATABASE_URL — PostgreSQL connection string
- MEILISEARCH_API_KEY — MeiliSearch API key
