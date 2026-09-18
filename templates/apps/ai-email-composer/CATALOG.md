# AI Email Composer

- **slug**: `ai-email-composer`
- **cluster**: ai-first
- **type**: full-stack
- **layout**: dashboard

AI drafting, tone adjustment, and reusable email templates with send capability

> **This is a complete, working app, already built.** The data model, handlers, and screens below all exist on disk (paths shown). Treat this as the user's existing codebase: **adapt the listed files in place** for the request; do not recreate tables, handlers, or pages that already exist, and do not add packages for functionality already implemented here.

## Features

`auth`, `ai-generation`, `rich-text-editing`, `email-templates`, `email-send`

## Data model (7 domain tables)

_Already created by the existing SQL in `api/migrations/` — do NOT add new migrations for these tables._

- **devices** — id, createdAt, updatedAt, userId, name, pushPlatform, pushSubscription, hasPushSubscription
- **email_contacts** — id, user_id, email, name, tags, last_contacted_at, created_at, updated_at
- **email_drafts** — id, user_id, template_id, subject, body, body_html, recipients, cc, bcc, tone, status, ai_generated, …
- **email_templates** — id, user_id, name, description, subject, body, variables, category, last_used_at, created_at, updated_at
- **payments** — id, createdAt, updatedAt, userId, transactionId, productId, platformKey, data, receipt
- **sent_emails** — id, user_id, draft_id, recipient_email, status, opened_at, clicked_at, bounced_at, complained_at, mailgun_message_id, mailgun_event, created_at, …
- **webhook_events** — id, user_id, source, event_type, payload, signature_valid, processed_at, created_at

## API surface (handlers)

_These endpoints already exist — open and extend the named file, never recreate it._

- **contacts** — `api/src/handlers/contacts.ts`
- **drafts** — `api/src/handlers/drafts.ts`
- **sentEmails** — `api/src/handlers/sentEmails.ts`
- **templates** — `api/src/handlers/templates.ts`
- **webhooks** — `api/src/handlers/webhooks.ts`

## Screens (13)

_These pages already exist — edit the named file in place, never create a parallel one._

- **Login** `/login` → `app/src/pages/Login.tsx`
- **Signup** `/signup` → `app/src/pages/Signup.tsx`
- **ForgotPassword** `/forgot-password` → `app/src/pages/ForgotPassword.tsx`
- **ResetPassword** `/reset-password` → `app/src/pages/ResetPassword.tsx`
- **Dashboard** `/dashboard` (auth) → `app/src/pages/Dashboard.tsx`
- **Landing** `/` → `app/src/pages/Landing.tsx`
- **Inbox** `/inbox` (auth) → `app/src/pages/Inbox.tsx`
- **Compose** `/compose` (auth) → `app/src/pages/Compose.tsx`
- **Templates** `/templates` (auth) → `app/src/pages/Templates.tsx`
- **Analytics** `/analytics` (auth) → `app/src/pages/Analytics.tsx`
- **Settings** `/settings` (auth) → `app/src/pages/Settings.tsx`
- **Profile** `/profile` (auth) → `app/src/pages/Profile.tsx`
- **Billing** `/billing` (auth) → `app/src/pages/Billing.tsx`

## Subscription tiers

free / pro / team — gated by: maxDrafts, maxTemplates, advancedFeatures, canExport, retentionDays

## Integrations (9 @molecule/* packages)

- **AI**: `@molecule/api-ai-anthropic`, `@molecule/api-ai-summarization`, `@molecule/app-ai-copilot`
- **Database**: `@molecule/api-database-postgresql`
- **Domain resources**: `@molecule/api-resource-user`
- **Email**: `@molecule/api-emails-mailgun`
- **Frontend / UI**: `@molecule/app-rich-text`, `@molecule/app-data-table`
- **Other API**: `@molecule/api-templating-handlebars`

## Required secrets

- DATABASE_URL — PostgreSQL connection string
- ANTHROPIC_API_KEY — Anthropic API key for Claude
- MAILGUN_API_KEY — Mailgun API key for sending emails
- MAILGUN_DOMAIN — Mailgun sending domain (e.g. mg.yourdomain.com)
