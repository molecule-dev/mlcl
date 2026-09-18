# Presentation Builder

- **slug**: `presentation-builder`
- **cluster**: creative-tools
- **type**: full-stack
- **layout**: dashboard

Google Slides-like presentation tool with slides, themes, animations, and export

> **This is a complete, working app, already built.** The data model, handlers, and screens below all exist on disk (paths shown). Treat this as the user's existing codebase: **adapt the listed files in place** for the request; do not recreate tables, handlers, or pages that already exist, and do not add packages for functionality already implemented here.

## Features

`auth`, `slides`, `themes`, `animations`, `collaboration`, `export`

## Data model (9 domain tables)

_Already created by the existing SQL in `api/migrations/` — do NOT add new migrations for these tables._

- **devices** — id, createdAt, updatedAt, userId, name, pushPlatform, pushSubscription, hasPushSubscription
- **presentation_exports** — id, presentation_id, requested_by, format, status, download_url, error, created_at, completed_at
- **presentation_shares** — id, presentation_id, shared_with_user_id, email, role, accepted_at, created_at
- **presentation_themes** — id, owner_id, name, colors, fonts, background_image, is_system, created_at
- **presentation_views** — id, presentation_id, viewer_user_id, viewer_ip_hash, viewer_country, viewed_at
- **presentations** — id, owner_id, title, description, theme_id, is_public, public_slug, slide_count, trashed_at, created_at, updated_at
- **resource_tags** — id, tagId, resourceType, resourceId, createdAt
- **slides** — id, presentation_id, layout, content, speaker_notes, background, transition, position, created_at, updated_at
- **tags** — id, name, slug, color, description, createdAt, updatedAt

## API surface (handlers)

_These endpoints already exist — open and extend the named file, never recreate it._

- **exports** — `api/src/handlers/exports.ts`
- **presentations** — `api/src/handlers/presentations.ts`
- **slides** — `api/src/handlers/slides.ts`
- **themes** — `api/src/handlers/themes.ts`

## Screens (13)

_These pages already exist — edit the named file in place, never create a parallel one._

- **Landing** `/` → `app/src/pages/Landing.tsx`
- **Login** `/login` → `app/src/pages/Login.tsx`
- **Signup** `/signup` → `app/src/pages/Signup.tsx`
- **ForgotPassword** `/forgot-password` → `app/src/pages/ForgotPassword.tsx`
- **ResetPassword** `/reset-password` → `app/src/pages/ResetPassword.tsx`
- **Decks** `/decks` (auth) → `app/src/pages/Decks.tsx`
- **Editor** `/decks/:id/edit` (auth) → `app/src/pages/Editor.tsx`
- **Present** `/decks/:id/present` (auth) → `app/src/pages/Present.tsx`
- **Templates** `/templates` (auth) → `app/src/pages/Templates.tsx`
- **Settings** `/settings` (auth) → `app/src/pages/Settings.tsx`
- **Analytics** `/analytics` (auth) → `app/src/pages/Analytics.tsx`
- **Shared** `/shared` (auth) → `app/src/pages/Shared.tsx`
- **Notifications** `/notifications` (auth) → `app/src/pages/Notifications.tsx`

## Subscription tiers

free / pro / team — gated by: maxExports, maxPresentations, maxSlides, maxThemes, advancedFeatures, canExport, retentionDays

## Integrations (14 @molecule/* packages)

- **Database**: `@molecule/api-database-postgresql`
- **Domain resources**: `@molecule/api-resource-user`, `@molecule/api-resource-tag`
- **Frontend / UI**: `@molecule/app-drag-drop`, `@molecule/app-keyboard-shortcuts`, `@molecule/app-command-palette`, `@molecule/app-file-upload`, `@molecule/app-markdown`
- **Other API**: `@molecule/api-pdf-pdfkit`
- **Realtime**: `@molecule/api-realtime-socketio`, `@molecule/app-realtime-socketio`
- **Search**: `@molecule/api-search-meilisearch`
- **Uploads & media**: `@molecule/api-uploads-s3`, `@molecule/api-image-sharp`

## Required secrets

- DATABASE_URL — PostgreSQL connection string
- S3_BUCKET — S3 bucket for asset storage
