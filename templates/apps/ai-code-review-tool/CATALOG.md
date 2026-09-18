# AI Code Review Tool

- **slug**: `ai-code-review-tool`
- **cluster**: ai-first
- **type**: full-stack
- **layout**: dashboard

Automated PR review with AI explanations, suggestions, and code quality scoring

> **This is a complete, working app, already built.** The data model, handlers, and screens below all exist on disk (paths shown). Treat this as the user's existing codebase: **adapt the listed files in place** for the request; do not recreate tables, handlers, or pages that already exist, and do not add packages for functionality already implemented here.

## Features

`auth`, `github-oauth`, `webhooks`, `ai-review`, `code-editor`

## Data model (11 domain tables)

_Already created by the existing SQL in `api/migrations/` — do NOT add new migrations for these tables._

- **api_credentials** — id, owner_id, user_id, createdAt, updatedAt, provider, encrypted_token, scopes_json, expires_at
- **custom_rules** — id, owner_id, user_id, createdAt, updatedAt, name, description, language, pattern, severity, enabled
- **devices** — id, createdAt, updatedAt, userId, name, pushPlatform, pushSubscription, hasPushSubscription
- **notifications** — id, user_id, owner_id, createdAt, kind, title, body, link, read_at
- **payments** — id, createdAt, updatedAt, userId, transactionId, productId, platformKey, data, receipt
- **pull_requests** — id, owner_id, user_id, repository_id, createdAt, updatedAt, provider_pr_number, title, author_login, base_ref, head_ref, state, …
- **repositories** — id, owner_id, user_id, createdAt, updatedAt, provider, provider_repo_id, full_name, default_branch, install_id, webhook_secret_encrypted, last_sync_at, …
- **review_comments** — id, owner_id, user_id, review_id, createdAt, file_path, line_start, line_end, severity, category, body_md, suggested_patch, …
- **review_queue** — id, owner_id, user_id, repository_id, pr_id, createdAt, updatedAt, payload_json, attempts, status, enqueued_at
- **reviews** — id, owner_id, user_id, pr_id, createdAt, updatedAt, status, quality_score, severity_summary_json, tokens_used, cost_cents, started_at, …
- **webhook_events** — id, owner_id, user_id, repository_id, createdAt, github_delivery_id, event_type, payload_json, received_at, signature_valid

## API surface (handlers)

_These endpoints already exist — open and extend the named file, never recreate it._

- **api-credentials** — `api/src/handlers/api-credentials.ts`
- **auth** — `api/src/handlers/auth.ts`
- **custom-rules** — `api/src/handlers/custom-rules.ts`
- **notifications** — `api/src/handlers/notifications.ts`
- **pull-requests** — `api/src/handlers/pull-requests.ts`
- **reports** — `api/src/handlers/reports.ts`
- **repositories** — `api/src/handlers/repositories.ts`
- **review-queue** — `api/src/handlers/review-queue.ts`
- **reviews** — `api/src/handlers/reviews.ts`
- **webhook-events** — `api/src/handlers/webhook-events.ts`
- **webhooks** — `api/src/handlers/webhooks.ts`

## Screens (17)

_These pages already exist — edit the named file in place, never create a parallel one._

- **Login** `/login` → `app/src/pages/Login.tsx`
- **Signup** `/signup` → `app/src/pages/Signup.tsx`
- **ForgotPassword** `/forgot-password` → `app/src/pages/ForgotPassword.tsx`
- **ResetPassword** `/reset-password` → `app/src/pages/ResetPassword.tsx`
- **Dashboard** `/dashboard` (auth) → `app/src/pages/Dashboard.tsx`
- **Landing** `/` → `app/src/pages/Landing.tsx`
- **PullRequestDetail** `/prs/:id` (auth) → `app/src/pages/PullRequestDetail.tsx`
- **Repositories** `/repos` (auth) → `app/src/pages/Repositories.tsx`
- **ReviewHistory** `/history` (auth) → `app/src/pages/ReviewHistory.tsx`
- **RulesEditor** `/rules` (auth) → `app/src/pages/RulesEditor.tsx`
- **Settings** `/settings` (auth) → `app/src/pages/Settings.tsx`
- **RepositoryDetail** `/repos/:id` (auth) → `app/src/pages/RepositoryDetail.tsx`
- **Reports** `/reports` (auth) → `app/src/pages/Reports.tsx`
- **Notifications** `/notifications` (auth) → `app/src/pages/Notifications.tsx`
- **Search** `/search` (auth) → `app/src/pages/Search.tsx`
- **Profile** `/profile` (auth) → `app/src/pages/Profile.tsx`
- **NotFound** `*` → `app/src/pages/NotFound.tsx`

## Subscription tiers

free / pro / team — gated by: maxReviews, maxWebhooks, advancedFeatures, canExport, retentionDays

## Integrations (10 @molecule/* packages)

- **AI**: `@molecule/api-ai-anthropic`, `@molecule/api-ai-agents`, `@molecule/app-ai-assistant`
- **Auth & permissions**: `@molecule/api-oauth-github`
- **Database**: `@molecule/api-database-postgresql`
- **Domain resources**: `@molecule/api-resource-user`
- **Frontend / UI**: `@molecule/app-code-editor`, `@molecule/app-markdown`, `@molecule/app-data-table`
- **Other API**: `@molecule/api-webhook-http`

## Required secrets

- DATABASE_URL — PostgreSQL connection string
- ANTHROPIC_API_KEY — Anthropic API key for Claude
- GITHUB_CLIENT_ID — GitHub OAuth client ID
- GITHUB_CLIENT_SECRET — GitHub OAuth client secret
- GITHUB_WEBHOOK_SECRET — GitHub webhook secret for PR events
