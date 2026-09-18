# Email Client

- **slug**: `email-client`
- **cluster**: communication
- **type**: full-stack
- **layout**: dashboard

Gmail-like email client with IMAP/SMTP, labels, compose, threads, and search

> **This is a complete, working app, already built.** The data model, handlers, and screens below all exist on disk (paths shown). Treat this as the user's existing codebase: **adapt the listed files in place** for the request; do not recreate tables, handlers, or pages that already exist, and do not add packages for functionality already implemented here.

## Features

`auth`, `search`, `labels`, `threads`, `compose`, `attachments`

## Data model (8 domain tables)

_Already created by the existing SQL in `api/migrations/` — do NOT add new migrations for these tables._

- **devices** — id, createdAt, updatedAt, userId, name, pushPlatform, pushSubscription, hasPushSubscription
- **email_folders** — id, user_id, name, color, created_at, updated_at, updatedAt
- **email_label_assignments** — id, label_id, email_id, created_at
- **email_labels** — id, user_id, name, color, created_at, updated_at, updatedAt
- **emails** — id, user_id, thread_id, from, to, cc, bcc, subject, body, folder, is_read, is_starred, …
- **payments** — id, createdAt, updatedAt, userId, transactionId, productId, platformKey, data, receipt
- **resource_tags** — id, tagId, resourceType, resourceId, createdAt
- **tags** — id, name, slug, color, description, createdAt, updatedAt

## API surface (handlers)

_These endpoints already exist — open and extend the named file, never recreate it._

- **\_seed** — `api/src/handlers/_seed.ts`
- **drafts** — `api/src/handlers/drafts.ts`
- **emails** — `api/src/handlers/emails.ts`
- **folders** — `api/src/handlers/folders.ts`
- **labels** — `api/src/handlers/labels.ts`

## Screens (11)

_These pages already exist — edit the named file in place, never create a parallel one._

- **Landing** `/` → `app/src/pages/Landing.tsx`
- **Login** `/login` → `app/src/pages/Login.tsx`
- **Signup** `/signup` → `app/src/pages/Signup.tsx`
- **ForgotPassword** `/forgot-password` → `app/src/pages/ForgotPassword.tsx`
- **ResetPassword** `/reset-password` → `app/src/pages/ResetPassword.tsx`
- **Inbox** `/inbox` (auth) → `app/src/pages/Inbox.tsx`
- **Compose** `/compose` (auth) → `app/src/pages/Compose.tsx`
- **ThreadView** `/thread/:id` (auth) → `app/src/pages/ThreadView.tsx`
- **Drafts** `/drafts` (auth) → `app/src/pages/Drafts.tsx`
- **Starred** `/starred` (auth) → `app/src/pages/Starred.tsx`
- **Settings** `/settings` (auth) → `app/src/pages/Settings.tsx`

## Subscription tiers

free / pro / team — gated by: maxDrafts, maxEmails, maxFolders, maxLabels, advancedFeatures, canExport, retentionDays

## Integrations (14 @molecule/* packages)

- **Database**: `@molecule/api-database-postgresql`
- **Domain resources**: `@molecule/api-resource-user`, `@molecule/api-resource-tag`
- **Email**: `@molecule/api-emails-mailgun`
- **Frontend / UI**: `@molecule/app-virtual-scroll`, `@molecule/app-file-upload`, `@molecule/app-markdown`, `@molecule/app-command-palette`, `@molecule/app-keyboard-shortcuts`
- **Notifications**: `@molecule/api-push-notifications-web-push`
- **Other API**: `@molecule/api-cron-node-cron`, `@molecule/api-encryption-aes`
- **Search**: `@molecule/api-search-meilisearch`
- **Uploads & media**: `@molecule/api-uploads-s3`

## Required secrets

- DATABASE_URL — PostgreSQL connection string
- S3_BUCKET — S3 bucket for email attachments
- MAILGUN_API_KEY — Mailgun API key for sending emails
