# AI Content Moderator

- **slug**: `ai-content-moderator`
- **cluster**: ai-first
- **type**: full-stack
- **layout**: admin

Review flagged content with AI-powered decisions, approval workflows, and moderation rule management

> **This is a complete, working app, already built.** The data model, handlers, and screens below all exist on disk (paths shown). Treat this as the user's existing codebase: **adapt the listed files in place** for the request; do not recreate tables, handlers, or pages that already exist, and do not add packages for functionality already implemented here.

## Features

`auth`, `content-moderation`, `ai-classification`, `data-table`

## Data model (8 domain tables)

_Already created by the existing SQL in `api/migrations/` — do NOT add new migrations for these tables._

- **ai_reviews** — id, flagged_content_id, owner_id, user_id, createdAt, classifier, confidence, explanation_md, model, tokens_used
- **api_tokens** — id, owner_id, user_id, createdAt, label, hashed_token, scopes_json, last_used_at
- **audit_log** — id, owner_id, user_id, createdAt, actor_user_id, action, target_type, target_id, before_json, after_json
- **devices** — id, createdAt, updatedAt, userId, name, pushPlatform, pushSubscription, hasPushSubscription
- **flagged_content** — id, owner_id, user_id, createdAt, updatedAt, source, content_type, content_ref, content_preview, language, submitted_at, status, …
- **moderation_rules** — id, owner_id, user_id, createdAt, updatedAt, name, description, kind, pattern_or_threshold, action, enabled, language_scope
- **notifications** — id, user_id, owner_id, createdAt, kind, title, body, link, read_at
- **payments** — id, createdAt, updatedAt, userId, transactionId, productId, platformKey, data, receipt

## API surface (handlers)

_These endpoints already exist — open and extend the named file, never recreate it._

- **api-tokens** — `api/src/handlers/api-tokens.ts`
- **audit-log** — `api/src/handlers/audit-log.ts`
- **moderation** — `api/src/handlers/moderation.ts`
- **notifications** — `api/src/handlers/notifications.ts`
- **rules** — `api/src/handlers/rules.ts`

## Screens (13)

_These pages already exist — edit the named file in place, never create a parallel one._

- **Login** `/login` → `app/src/pages/Login.tsx`
- **Signup** `/signup` → `app/src/pages/Signup.tsx`
- **ForgotPassword** `/forgot-password` → `app/src/pages/ForgotPassword.tsx`
- **ResetPassword** `/reset-password` → `app/src/pages/ResetPassword.tsx`
- **Dashboard** `/dashboard` (auth) → `app/src/pages/Dashboard.tsx`
- **Landing** `/` → `app/src/pages/Landing.tsx`
- **Queue** `/queue` (auth) → `app/src/pages/Queue.tsx`
- **ReviewDetail** `/queue/:id` (auth) → `app/src/pages/ReviewDetail.tsx`
- **Rules** `/rules` (auth) → `app/src/pages/Rules.tsx`
- **Analytics** `/analytics` (auth) → `app/src/pages/Analytics.tsx`
- **Settings** `/settings` (auth) → `app/src/pages/Settings.tsx`
- **Profile** `/profile` (auth) → `app/src/pages/Profile.tsx`
- **Notifications** `/notifications` (auth) → `app/src/pages/Notifications.tsx`

## Subscription tiers

free / pro / team — gated by: maxModeration, maxRules, advancedFeatures, canExport, retentionDays

## Integrations (8 @molecule/* packages)

- **AI**: `@molecule/api-ai-anthropic`, `@molecule/api-ai-classification`, `@molecule/app-ai-assistant`
- **Database**: `@molecule/api-database-postgresql`
- **Domain resources**: `@molecule/api-resource-user`
- **Frontend / UI**: `@molecule/app-data-table`, `@molecule/app-markdown`
- **Other API**: `@molecule/api-content-moderation`

## Required secrets

- DATABASE_URL — PostgreSQL connection string
- ANTHROPIC_API_KEY — Anthropic API key for Claude
