# AI Writing Studio

- **slug**: `ai-writing-studio`
- **cluster**: ai-first
- **type**: full-stack
- **layout**: dashboard

Long-form AI content generation with editing, SEO, and style control

> **This is a complete, working app, already built.** The data model, handlers, and screens below all exist on disk (paths shown). Treat this as the user's existing codebase: **adapt the listed files in place** for the request; do not recreate tables, handlers, or pages that already exist, and do not add packages for functionality already implemented here.

## Features

`auth`, `ai-generation`, `rich-text-editing`, `image-generation`, `document-management`

## Data model (10 domain tables)

_Already created by the existing SQL in `api/migrations/` — do NOT add new migrations for these tables._

- **ai_suggestions** — id, user_id, document_id, kind, input_text, output_text, accepted, tokens_used, created_at
- **api_credentials** — id, user_id, provider, encrypted_key, label, last_used_at, created_at, updated_at
- **devices** — id, createdAt, updatedAt, userId, name, pushPlatform, pushSubscription, hasPushSubscription
- **document_templates** — id, user_id, name, description, category, body_template, placeholder_vars, is_system, created_at, updated_at
- **document_versions** — id, document_id, user_id, version_number, body_md, snapshot_size, created_at
- **documents** — id, user_id, title, slug, content, body_html, outline, summary, tags, format, status, word_count, …
- **generated_images** — id, user_id, document_id, prompt, revised_prompt, s3_key, url, model, size, created_at
- **payments** — id, createdAt, updatedAt, userId, transactionId, productId, platformKey, data, receipt
- **seo_analyses** — id, user_id, document_id, target_keywords, score, suggestions, analyzed_at, created_at
- **user_preferences** — id, user_id, default_tone, auto_save, ai_suggestions, notify_email, created_at, updated_at

## API surface (handlers)

_These endpoints already exist — open and extend the named file, never recreate it._

- **analytics** — `api/src/handlers/analytics.ts`
- **credentials** — `api/src/handlers/credentials.ts`
- **dashboard** — `api/src/handlers/dashboard.ts`
- **documents** — `api/src/handlers/documents.ts`
- **generate** — `api/src/handlers/generate.ts`
- **images** — `api/src/handlers/images.ts`
- **integrations** — `api/src/handlers/integrations.ts`
- **preferences** — `api/src/handlers/preferences.ts`
- **profile** — `api/src/handlers/profile.ts`
- **seo** — `api/src/handlers/seo.ts`
- **templates** — `api/src/handlers/templates.ts`

## Screens (14)

_These pages already exist — edit the named file in place, never create a parallel one._

- **Landing** `/` → `app/src/pages/Landing.tsx`
- **Login** `/login` → `app/src/pages/Login.tsx`
- **Signup** `/signup` → `app/src/pages/Signup.tsx`
- **ForgotPassword** `/forgot-password` → `app/src/pages/ForgotPassword.tsx`
- **ResetPassword** `/reset-password` → `app/src/pages/ResetPassword.tsx`
- **Dashboard** `/dashboard` (auth) → `app/src/pages/Dashboard.tsx`
- **Editor** `/documents/:id` (auth) → `app/src/pages/Editor.tsx`
- **Documents** `/documents` (auth) → `app/src/pages/Documents.tsx`
- **Templates** `/templates` (auth) → `app/src/pages/Templates.tsx`
- **SEOAnalysis** `/documents/:id/seo` (auth) → `app/src/pages/SEOAnalysis.tsx`
- **Settings** `/settings` (auth) → `app/src/pages/Settings.tsx`
- **Profile** `/profile` (auth) → `app/src/pages/Profile.tsx`
- **Billing** `/billing` (auth) → `app/src/pages/Billing.tsx`
- **Analytics** `/analytics` (auth) → `app/src/pages/Analytics.tsx`

## Subscription tiers

free / pro / team — gated by: maxDocuments, maxGenerate, maxImages, advancedFeatures, canExport, retentionDays

## Integrations (12 @molecule/* packages)

- **AI**: `@molecule/api-ai-anthropic`, `@molecule/api-ai-openai`, `@molecule/api-ai-summarization`, `@molecule/api-ai-image-generation-openai`, `@molecule/app-ai-copilot`, `@molecule/app-ai-image-generator`
- **Database**: `@molecule/api-database-postgresql`
- **Domain resources**: `@molecule/api-resource-user`
- **Frontend / UI**: `@molecule/app-markdown`, `@molecule/app-rich-text`, `@molecule/app-keyboard-shortcuts`
- **Uploads & media**: `@molecule/api-uploads-s3`

## Required secrets

- DATABASE_URL — PostgreSQL connection string
- ANTHROPIC_API_KEY — Anthropic API key for Claude
- OPENAI_API_KEY — OpenAI API key for GPT and DALL-E
- AWS_ACCESS_KEY_ID — AWS access key for S3 uploads
- AWS_SECRET_ACCESS_KEY — AWS secret key for S3 uploads
- S3_BUCKET — S3 bucket name for file uploads
