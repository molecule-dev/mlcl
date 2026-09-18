# AI Translation Hub

- **slug**: `ai-translation-hub`
- **cluster**: ai-first
- **type**: full-stack
- **layout**: dashboard

Document and website translation with AI review and project management

> **This is a complete, working app, already built.** The data model, handlers, and screens below all exist on disk (paths shown). Treat this as the user's existing codebase: **adapt the listed files in place** for the request; do not recreate tables, handlers, or pages that already exist, and do not add packages for functionality already implemented here.

## Features

`auth`, `translation`, `document-upload`, `review`, `export`, `projects`

## Data model (11 domain tables)

_Already created by the existing SQL in `api/migrations/` — do NOT add new migrations for these tables._

- **api_tokens** — id, user_id, label, hashed_token, last_used_at, created_at
- **devices** — id, createdAt, updatedAt, userId, name, pushPlatform, pushSubscription, hasPushSubscription
- **glossary_terms** — id, user_id, project_id, source_lang, target_lang, source_term, target_term, notes, created_at, updated_at
- **memory_entries** — id, user_id, source_lang, target_lang, source_text, target_text, used_count, last_used_at, created_at, updated_at
- **notifications** — id, user_id, kind, title, body, link, read_at, created_at
- **payments** — id, createdAt, updatedAt, userId, transactionId, productId, platformKey, data, receipt
- **project_files** — id, project_id, user_id, filename, mime, s3_key, segment_count, status, created_at
- **segment_comments** — id, segment_id, user_id, body, created_at
- **team_members** — id, user_id, member_user_id, email, role, created_at
- **translation_projects** — id, user_id, name, description, source_lang, target_langs, status, due_date, created_at, updated_at
- **translation_segments** — id, user_id, project_id, file_id, source_text, target_text, source_lang, target_lang, machine_translation, status, translator_id, reviewer_id, …

## API surface (handlers)

_These endpoints already exist — open and extend the named file, never recreate it._

- **activity** — `api/src/handlers/activity.ts`
- **api-tokens** — `api/src/handlers/api-tokens.ts`
- **glossary** — `api/src/handlers/glossary.ts`
- **memory** — `api/src/handlers/memory.ts`
- **notifications** — `api/src/handlers/notifications.ts`
- **projects** — `api/src/handlers/projects.ts`
- **reports** — `api/src/handlers/reports.ts`
- **segments** — `api/src/handlers/segments.ts`
- **team** — `api/src/handlers/team.ts`
- **translations** — `api/src/handlers/translations.ts`

## Screens (18)

_These pages already exist — edit the named file in place, never create a parallel one._

- **Landing** `/` → `app/src/pages/Landing.tsx`
- **Login** `/login` → `app/src/pages/Login.tsx`
- **Signup** `/signup` → `app/src/pages/Signup.tsx`
- **ForgotPassword** `/forgot-password` → `app/src/pages/ForgotPassword.tsx`
- **ResetPassword** `/reset-password` → `app/src/pages/ResetPassword.tsx`
- **Dashboard** `/dashboard` (auth) → `app/src/pages/Dashboard.tsx`
- **Translate** `/translate/:id` (auth) → `app/src/pages/Translate.tsx`
- **Projects** `/projects` (auth) → `app/src/pages/Projects.tsx`
- **Glossary** `/glossary` (auth) → `app/src/pages/Glossary.tsx`
- **Memory** `/memory` (auth) → `app/src/pages/Memory.tsx`
- **Settings** `/settings` (auth) → `app/src/pages/Settings.tsx`
- **ProjectDetail** `/projects/:id` (auth) → `app/src/pages/ProjectDetail.tsx`
- **NewProject** `/projects/new` (auth) → `app/src/pages/NewProject.tsx`
- **Review** `/review` (auth) → `app/src/pages/Review.tsx`
- **Profile** `/profile` (auth) → `app/src/pages/Profile.tsx`
- **Notifications** `/notifications` (auth) → `app/src/pages/Notifications.tsx`
- **Team** `/team` (auth) → `app/src/pages/Team.tsx`
- **Billing** `/billing` (auth) → `app/src/pages/Billing.tsx`

## Subscription tiers

free / pro / team — gated by: maxProjects, maxTranslations, advancedFeatures, canExport, retentionDays

## Integrations (9 @molecule/* packages)

- **AI**: `@molecule/api-ai-anthropic`, `@molecule/api-ai-translation-deepl`, `@molecule/app-ai-assistant`
- **Database**: `@molecule/api-database-postgresql`
- **Domain resources**: `@molecule/api-resource-user`
- **Frontend / UI**: `@molecule/app-data-table`, `@molecule/app-file-upload`
- **Other API**: `@molecule/api-import-export-csv`
- **Uploads & media**: `@molecule/api-uploads-s3`

## Required secrets

- DATABASE_URL — PostgreSQL connection string
- ANTHROPIC_API_KEY — Anthropic API key for Claude AI suggestions
- DEEPL_API_KEY — DeepL API key for document translation
- AWS_ACCESS_KEY_ID — AWS access key for S3 uploads
- AWS_SECRET_ACCESS_KEY — AWS secret key for S3 uploads
- S3_BUCKET — S3 bucket for document storage
