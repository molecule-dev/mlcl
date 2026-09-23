# RAG Knowledge Base

- **slug**: `rag-knowledge-base`
- **cluster**: ai-first
- **type**: full-stack
- **layout**: dashboard

Upload documents, semantic search, and AI-powered Q&A

> **This is a complete, working app, already built.** The data model, handlers, and screens below all exist on disk (paths shown). Treat this as the user's existing codebase: **adapt the listed files in place** for the request; do not recreate tables, handlers, or pages that already exist, and do not add packages for functionality already implemented here.

## Features

`auth`, `document-upload`, `semantic-search`, `ai-qa`, `rag`

## Data model (12 domain tables)

_Already created by the existing SQL in `api/migrations/` — do NOT add new migrations for these tables._

- **collections** — id, user_id, name, description, document_count, created_at, updatedAt
- **sources** — id, user_id, collection_id, kind, label, config_json, credentials_encrypted, last_sync_at, sync_status, doc_count, created_at, updatedAt
- **documents** — id, user_id, collection_id, source_id, title, slug, body_md, source_url, mime, size_bytes, s3_key, ingest_status, …
- **qa_conversations** — id, user_id, collection_id, title, started_at, last_message_at, created_at, updatedAt
- **qa_entries** — id, user_id, conversation_id, collection_id, question, answer_md, citations_json, confidence, model, tokens_used, response_ms, created_at, …
- **qa_messages** — id, user_id, conversation_id, entry_id, role, text, citations_json, created_at, updatedAt
- **graph_edges** — id, user_id, from_doc_id, to_doc_id, weight, kind, created_at, updatedAt
- **org_members** — id, user_id, member_user_id, invitee_email, role, invited_at, joined_at, created_at, updatedAt
- **notifications** — id, user_id, kind, title, body, link, read_at, created_at, updatedAt
- **api_tokens** — id, user_id, label, hashed_token, last_used_at, created_at, updatedAt
- **document_chunks** — id, document_id, user_id, chunk_index, body_text, page_number, heading, token_count, created_at, updatedAt
- **devices** — id, createdAt, updatedAt, userId, name, pushPlatform, pushSubscription, hasPushSubscription

## API surface (handlers)

_These endpoints already exist — open and extend the named file, never recreate it._

- **api-tokens** — `api/src/handlers/api-tokens.ts`
- **collections** — `api/src/handlers/collections.ts`
- **documents** — `api/src/handlers/documents.ts`
- **graph** — `api/src/handlers/graph.ts`
- **members** — `api/src/handlers/members.ts`
- **notifications** — `api/src/handlers/notifications.ts`
- **qa** — `api/src/handlers/qa.ts`
- **reports** — `api/src/handlers/reports.ts`
- **settings** — `api/src/handlers/settings.ts`
- **sources** — `api/src/handlers/sources.ts`

## Screens (17)

_These pages already exist — edit the named file in place, never create a parallel one._

- **Landing** `/` → `app/src/pages/Landing.tsx`
- **Login** `/login` → `app/src/pages/Login.tsx`
- **Signup** `/signup` → `app/src/pages/Signup.tsx`
- **ForgotPassword** `/forgot-password` → `app/src/pages/ForgotPassword.tsx`
- **ResetPassword** `/reset-password` → `app/src/pages/ResetPassword.tsx`
- **Ask** `/ask` (auth) → `app/src/pages/Ask.tsx`
- **Documents** `/documents` (auth) → `app/src/pages/Documents.tsx`
- **DocumentDetail** `/documents/:id` (auth) → `app/src/pages/DocumentDetail.tsx`
- **Sources** `/sources` (auth) → `app/src/pages/Sources.tsx`
- **Analytics** `/analytics` (auth) → `app/src/pages/Analytics.tsx`
- **Settings** `/settings` (auth) → `app/src/pages/Settings.tsx`
- **SourceDetail** `/sources/:id` (auth) → `app/src/pages/SourceDetail.tsx`
- **History** `/history` (auth) → `app/src/pages/History.tsx`
- **KnowledgeGraph** `/graph` (auth) → `app/src/pages/KnowledgeGraph.tsx`
- **Members** `/members` (auth) → `app/src/pages/Members.tsx`
- **Notifications** `/notifications` (auth) → `app/src/pages/Notifications.tsx`
- **Billing** `/billing` (auth) → `app/src/pages/Billing.tsx`

## Subscription tiers

free / pro / team — gated by: maxDocuments, maxQa, advancedFeatures, canExport, retentionDays

## Integrations (12 @molecule/* packages)

- **AI**: `@molecule/api-ai-anthropic`, `@molecule/api-ai-rag`, `@molecule/api-ai-embeddings-openai`, `@molecule/api-ai-vector-store-pgvector`, `@molecule/app-ai-assistant`
- **Database**: `@molecule/api-database-postgresql`
- **Domain resources**: `@molecule/api-resource-user`
- **Frontend / UI**: `@molecule/app-file-upload`, `@molecule/app-data-table`, `@molecule/app-markdown`
- **Search**: `@molecule/api-search-meilisearch`
- **Uploads & media**: `@molecule/api-uploads-s3`

## Required secrets

- DATABASE_URL — PostgreSQL connection string
- ANTHROPIC_API_KEY — Anthropic API key for Claude
- OPENAI_API_KEY — OpenAI API key for embeddings
- MEILISEARCH_API_KEY — Meilisearch API key
- AWS_ACCESS_KEY_ID — AWS access key for S3
- AWS_SECRET_ACCESS_KEY — AWS secret key for S3
- S3_BUCKET — S3 bucket for document storage
