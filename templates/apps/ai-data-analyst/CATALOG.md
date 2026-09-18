# AI Data Analyst

- **slug**: `ai-data-analyst`
- **cluster**: ai-first
- **type**: full-stack
- **layout**: dashboard

Upload data, ask questions in natural language, and get charts and insights

> **This is a complete, working app, already built.** The data model, handlers, and screens below all exist on disk (paths shown). Treat this as the user's existing codebase: **adapt the listed files in place** for the request; do not recreate tables, handlers, or pages that already exist, and do not add packages for functionality already implemented here.

## Features

`auth`, `data-upload`, `ai-analysis`, `charts`, `data-table`, `export`

## Data model (13 domain tables)

_Already created by the existing SQL in `api/migrations/` — do NOT add new migrations for these tables._

- **analyses** — id, user_id, dataset_id, prompt_text, generated_sql, result_rows_json, charts_json, narrative_md, model, tokens_used, created_at
- **dataset_columns** — id, dataset_id, name, type, nullable, unique_count, example, position, created_at
- **dataset_rows** — id, dataset_id, row_index, values_json, created_at
- **datasets** — id, user_id, name, description, format, source_url, row_count, col_count, size_bytes, last_analyzed_at, status, created_at, …
- **devices** — id, createdAt, updatedAt, userId, name, pushPlatform, pushSubscription, hasPushSubscription
- **insights** — id, user_id, dataset_id, kind, headline, body_md, confidence, detected_at, created_at
- **kpis** — id, user_id, key, value, recorded_at
- **notifications** — id, user_id, kind, title, body, link, read_at, created_at
- **payments** — id, createdAt, updatedAt, userId, transactionId, productId, platformKey, data, receipt
- **saved_reports** — id, user_id, title, description, dataset_id, layout_json, last_run_at, created_at, updated_at
- **uploads** — id, user_id, filename, mime, size_bytes, s3_key, status, error_message, uploaded_at, created_at
- **api_keys** — id, user_id, name, key_hash, key_masked, scopes, last_used_at, revoked_at, created_at
- **user_settings** — user_id, organization, preferences, integrations, updated_at

## API surface (handlers)

_These endpoints already exist — open and extend the named file, never recreate it._

- **\_seed** — `api/src/handlers/_seed.ts`
- **analysis** — `api/src/handlers/analysis.ts`
- **api_keys** — `api/src/handlers/api_keys.ts`
- **datasets** — `api/src/handlers/datasets.ts`
- **insights** — `api/src/handlers/insights.ts`
- **notifications** — `api/src/handlers/notifications.ts`
- **profile** — `api/src/handlers/profile.ts`
- **queries** — `api/src/handlers/queries.ts`
- **reports** — `api/src/handlers/reports.ts`
- **saved_reports** — `api/src/handlers/saved_reports.ts`
- **settings** — `api/src/handlers/settings.ts`
- **uploads** — `api/src/handlers/uploads.ts`

## Screens (13)

_These pages already exist — edit the named file in place, never create a parallel one._

- **Login** `/login` → `app/src/pages/Login.tsx`
- **Signup** `/signup` → `app/src/pages/Signup.tsx`
- **ForgotPassword** `/forgot-password` → `app/src/pages/ForgotPassword.tsx`
- **ResetPassword** `/reset-password` → `app/src/pages/ResetPassword.tsx`
- **Dashboard** `/dashboard` (auth) → `app/src/pages/Dashboard.tsx`
- **Landing** `/` → `app/src/pages/Landing.tsx`
- **QueryEditor** `/query` (auth) → `app/src/pages/QueryEditor.tsx`
- **Datasets** `/datasets` (auth) → `app/src/pages/Datasets.tsx`
- **DatasetDetail** `/datasets/:id` (auth) → `app/src/pages/DatasetDetail.tsx`
- **Reports** `/reports` (auth) → `app/src/pages/Reports.tsx`
- **ReportDetail** `/reports/:id` (auth) → `app/src/pages/ReportDetail.tsx`
- **Upload** `/upload` (auth) → `app/src/pages/Upload.tsx`
- **Settings** `/settings` (auth) → `app/src/pages/Settings.tsx`

## Subscription tiers

free / pro / team — gated by: maxAnalysis, maxDatasets, advancedFeatures, canExport, retentionDays

## Integrations (12 @molecule/* packages)

- **AI**: `@molecule/api-ai-anthropic`, `@molecule/api-ai-rag`, `@molecule/api-ai-embeddings-openai`, `@molecule/api-ai-vector-store-pgvector`, `@molecule/app-ai-assistant`
- **Database**: `@molecule/api-database-postgresql`
- **Domain resources**: `@molecule/api-resource-user`
- **Frontend / UI**: `@molecule/app-charts`, `@molecule/app-data-table`, `@molecule/app-file-upload`
- **Other API**: `@molecule/api-import-export-csv`
- **Uploads & media**: `@molecule/api-uploads-s3`

## Required secrets

- DATABASE_URL — PostgreSQL connection string
- ANTHROPIC_API_KEY — Anthropic API key for Claude
- OPENAI_API_KEY — OpenAI API key for embeddings
- AWS_ACCESS_KEY_ID — AWS access key for S3 uploads
- AWS_SECRET_ACCESS_KEY — AWS secret key for S3 uploads
- S3_BUCKET — S3 bucket name for data file storage
