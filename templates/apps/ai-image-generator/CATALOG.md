# AI Image Generator

- **slug**: `ai-image-generator`
- **cluster**: ai-first
- **type**: full-stack
- **layout**: dashboard

Text-to-image generation with gallery, variations, and style control

> **This is a complete, working app, already built.** The data model, handlers, and screens below all exist on disk (paths shown). Treat this as the user's existing codebase: **adapt the listed files in place** for the request; do not recreate tables, handlers, or pages that already exist, and do not add packages for functionality already implemented here.

## Features

`auth`, `image-generation`, `gallery`, `image-editing`

## Data model (12 domain tables)

_Already created by the existing SQL in `api/migrations/` — do NOT add new migrations for these tables._

- **api_credentials** — id, user_id, provider, hashed_key, masked_preview, created_at, updated_at
- **collection_images** — id, user_id, collection_id, image_id, position, created_at
- **collections** — id, user_id, name, description, cover_image_id, is_public, created_at, updated_at
- **credit_ledger** — id, user_id, delta, reason, reference_id, created_at
- **devices** — id, createdAt, updatedAt, userId, name, pushPlatform, pushSubscription, hasPushSubscription
- **edit_sessions** — id, user_id, base_image_id, kind, result_image_id, params, created_at, updated_at
- **generations** — id, user_id, prompt, negative_prompt, revised_prompt, model, provider, style_id, size, style, seed, parent_id, …
- **images** — id, generation_id, user_id, s3_key, url, mime, width, height, is_public, is_favorite, created_at
- **notifications** — id, user_id, kind, title, body, link, read_at, created_at
- **payments** — id, createdAt, updatedAt, userId, transactionId, productId, platformKey, data, receipt
- **prompt_library** — id, user_id, title, prompt_text, negative_prompt, default_style_id, tags, position, last_used_at, created_at, updated_at
- **style_presets** — id, user_id, name, prompt_modifier, negative_modifier, sample_image_url, description, created_at, updated_at

## API surface (handlers)

_These endpoints already exist — open and extend the named file, never recreate it._

- **api-keys** — `api/src/handlers/api-keys.ts`
- **bootstrap** — `api/src/handlers/bootstrap.ts`
- **collections** — `api/src/handlers/collections.ts`
- **credits** — `api/src/handlers/credits.ts`
- **gallery** — `api/src/handlers/gallery.ts`
- **generations** — `api/src/handlers/generations.ts`
- **models** — `api/src/handlers/models.ts`
- **notifications** — `api/src/handlers/notifications.ts`
- **plans** — `api/src/handlers/plans.ts`
- **profile** — `api/src/handlers/profile.ts`
- **prompts** — `api/src/handlers/prompts.ts`
- **styles** — `api/src/handlers/styles.ts`

## Screens (18)

_These pages already exist — edit the named file in place, never create a parallel one._

- **Landing** `/` → `app/src/pages/Landing.tsx`
- **Login** `/login` → `app/src/pages/Login.tsx`
- **Signup** `/signup` → `app/src/pages/Signup.tsx`
- **ForgotPassword** `/forgot-password` → `app/src/pages/ForgotPassword.tsx`
- **ResetPassword** `/reset-password` → `app/src/pages/ResetPassword.tsx`
- **Dashboard** `/dashboard` (auth) → `app/src/pages/Dashboard.tsx`
- **Generate** `/generate` (auth) → `app/src/pages/Generate.tsx`
- **Gallery** `/gallery` (auth) → `app/src/pages/Gallery.tsx`
- **ImageDetail** `/images/:id` (auth) → `app/src/pages/ImageDetail.tsx`
- **Styles** `/styles` (auth) → `app/src/pages/Styles.tsx`
- **Settings** `/settings` (auth) → `app/src/pages/Settings.tsx`
- **Editor** `/editor/:id` (auth) → `app/src/pages/Editor.tsx`
- **Collections** `/collections` (auth) → `app/src/pages/Collections.tsx`
- **CollectionDetail** `/collections/:id` (auth) → `app/src/pages/CollectionDetail.tsx`
- **Prompts** `/prompts` (auth) → `app/src/pages/Prompts.tsx`
- **Models** `/models` (auth) → `app/src/pages/Models.tsx`
- **Notifications** `/notifications` (auth) → `app/src/pages/Notifications.tsx`
- **Profile** `/profile/:id` (auth) → `app/src/pages/Profile.tsx`

## Subscription tiers

free / pro / team — gated by: maxGallery, maxGenerations, advancedFeatures, canExport, retentionDays

## Integrations (13 @molecule/* packages)

- **AI**: `@molecule/api-ai-anthropic`, `@molecule/api-ai-openai`, `@molecule/api-ai-image-generation-openai`, `@molecule/api-ai-image-generation-stability`, `@molecule/app-ai-copilot`, `@molecule/app-ai-image-generator`
- **Database**: `@molecule/api-database-postgresql`
- **Domain resources**: `@molecule/api-resource-user`
- **Frontend / UI**: `@molecule/app-gallery`, `@molecule/app-virtual-scroll`
- **Uploads & media**: `@molecule/api-uploads-s3`, `@molecule/api-image-sharp`, `@molecule/app-image-crop`

## Required secrets

- DATABASE_URL — PostgreSQL connection string
- OPENAI_API_KEY — OpenAI API key for DALL-E
- ANTHROPIC_API_KEY — Anthropic API key for prompt enhancement
- AWS_ACCESS_KEY_ID — AWS access key for S3 uploads
- AWS_SECRET_ACCESS_KEY — AWS secret key for S3 uploads
- S3_BUCKET — S3 bucket name for image storage
