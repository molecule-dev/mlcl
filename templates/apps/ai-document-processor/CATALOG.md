# AI Document Processor

- **slug**: `ai-document-processor`
- **cluster**: ai-first
- **type**: full-stack
- **layout**: dashboard

OCR, intelligent extraction, classification, and automated filing of scanned documents and PDFs with AI

> **This is a complete, working app, already built.** The data model, handlers, and screens below all exist on disk (paths shown). Treat this as the user's existing codebase: **adapt the listed files in place** for the request; do not recreate tables, handlers, or pages that already exist, and do not add packages for functionality already implemented here.

## Features

`auth`, `file-upload`, `ai-extraction`, `ai-classification`, `ai-summarization`, `data-table`, `export`

## Data model (8 domain tables)

_Already created by the existing SQL in `api/migrations/` — do NOT add new migrations for these tables._

- **api_tokens** — id, user_id, label, hashed_token, last_used_at, created_at, updatedAt
- **devices** — id, createdAt, updatedAt, userId, name, pushPlatform, pushSubscription, hasPushSubscription
- **document_events** — id, document_id, user_id, kind, detail_json, created_at
- **document_fields** — id, document_id, user_id, key, value, confidence, bbox_json, source, reviewed, corrected_value, created_at, updatedAt
- **documents** — id, user_id, source_type, title, mime, size_bytes, s3_key, doc_class, status, summary_md, language, page_count, …
- **extraction_rules** — id, user_id, name, doc_class, condition_json, action, action_args_json, priority, enabled, created_at, updatedAt
- **folders** — id, user_id, name, parent_id, created_at, updatedAt
- **payments** — id, createdAt, updatedAt, userId, transactionId, productId, platformKey, data, receipt

## API surface (handlers)

_These endpoints already exist — open and extend the named file, never recreate it._

- **api-tokens** — `api/src/handlers/api-tokens.ts`
- **documents** — `api/src/handlers/documents.ts`
- **extraction-rules** — `api/src/handlers/extraction-rules.ts`
- **extraction-templates** — `api/src/handlers/extraction-templates.ts`
- **folders** — `api/src/handlers/folders.ts`
- **integrations** — `api/src/handlers/integrations.ts`
- **processing** — `api/src/handlers/processing.ts`
- **reports** — `api/src/handlers/reports.ts`
- **upload** — `api/src/handlers/upload.ts`

## Screens (11)

_These pages already exist — edit the named file in place, never create a parallel one._

- **Login** `/login` → `app/src/pages/Login.tsx`
- **Signup** `/signup` → `app/src/pages/Signup.tsx`
- **ForgotPassword** `/forgot-password` → `app/src/pages/ForgotPassword.tsx`
- **ResetPassword** `/reset-password` → `app/src/pages/ResetPassword.tsx`
- **Dashboard** `/dashboard` (auth) → `app/src/pages/Dashboard.tsx`
- **Landing** `/` → `app/src/pages/Landing.tsx`
- **Documents** `/documents` (auth) → `app/src/pages/Documents.tsx`
- **DocumentDetail** `/documents/:id` (auth) → `app/src/pages/DocumentDetail.tsx`
- **Upload** `/upload` (auth) → `app/src/pages/Upload.tsx`
- **Rules** `/rules` (auth) → `app/src/pages/Rules.tsx`
- **Settings** `/settings` (auth) → `app/src/pages/Settings.tsx`

## Subscription tiers

free / pro / team — gated by: maxDocuments, maxProcessing, advancedFeatures, canExport, retentionDays

## Integrations (10 @molecule/* packages)

- **AI**: `@molecule/api-ai-anthropic`, `@molecule/api-ai-classification`, `@molecule/api-ai-summarization`, `@molecule/app-ai-assistant`
- **Database**: `@molecule/api-database-postgresql`
- **Domain resources**: `@molecule/api-resource-user`
- **Frontend / UI**: `@molecule/app-file-upload`, `@molecule/app-data-table`
- **Other API**: `@molecule/api-import-export-csv`
- **Uploads & media**: `@molecule/api-uploads-s3`

## Required secrets

- DATABASE_URL — PostgreSQL connection string
- ANTHROPIC_API_KEY — Anthropic API key for Claude (OCR, extraction, classification, summarization)
- AWS_ACCESS_KEY_ID — AWS access key for S3 document storage
- AWS_SECRET_ACCESS_KEY — AWS secret key for S3 document storage
- S3_BUCKET — S3 bucket name for uploaded documents
