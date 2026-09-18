# Contract Management

- **slug**: `contract-management`
- **cluster**: business-saas
- **type**: full-stack
- **layout**: dashboard

DocuSign-like contract management with templates, signing, expiry, and alerts — with built-in Stripe-backed subscription tiers

> **This is a complete, working app, already built.** The data model, handlers, and screens below all exist on disk (paths shown). Treat this as the user's existing codebase: **adapt the listed files in place** for the request; do not recreate tables, handlers, or pages that already exist, and do not add packages for functionality already implemented here.

## Features

`auth`, `search`, `contracts`, `templates`, `signing`, `expiry-alerts`, `audit-log`, `subscriptions`

## Data model (11 domain tables)

_Already created by the existing SQL in `api/migrations/` — do NOT add new migrations for these tables._

- **activities** — id, actorId, action, resourceType, resourceId, metadata, createdAt
- **activity_seen_status** — userId, lastSeenActivityId, updatedAt
- **contract_templates** — id, user_id, name, description, content, body_html, category, type, merge_fields, version, archived_at, created_by, …
- **contract_versions** — id, contract_id, user_id, body_html, body_md, generated_from_template_id, generated_at, created_at, updatedAt
- **contracts** — id, user_id, number, title, description, template_id, counterparty_id, party_name, party_email, type, status, amount_cents, …
- **counterparties** — id, user_id, organization, contact_name, email, phone, address, notes, type, created_at, updated_at, updatedAt
- **devices** — id, createdAt, updatedAt, userId, name, pushPlatform, pushSubscription, hasPushSubscription
- **notifications** — id, user_id, kind, title, body, contract_id, payload, link, read_at, created_at, updatedAt
- **payments** — id, createdAt, updatedAt, userId, transactionId, productId, platformKey, data, receipt
- **signature_events** — id, contract_id, signature_id, user_id, kind, occurred_at, ip, user_agent, payload, created_at, updatedAt
- **signatures** — id, contract_id, user_id, signer_name, signer_email, role, order, status, signed_at, ip, signature_blob_url, esign_signer_id, …

## API surface (handlers)

_These endpoints already exist — open and extend the named file, never recreate it._

- **contracts** — `api/src/handlers/contracts.ts`
- **counterparties** — `api/src/handlers/counterparties.ts`
- **notifications** — `api/src/handlers/notifications.ts`
- **profile** — `api/src/handlers/profile.ts`
- **reports** — `api/src/handlers/reports.ts`
- **sign-public** — `api/src/handlers/sign-public.ts`
- **signatures** — `api/src/handlers/signatures.ts`
- **templates** — `api/src/handlers/templates.ts`

## Screens (15)

_These pages already exist — edit the named file in place, never create a parallel one._

- **Landing** `/` → `app/src/pages/Landing.tsx`
- **Login** `/login` → `app/src/pages/Login.tsx`
- **Signup** `/signup` → `app/src/pages/Signup.tsx`
- **ForgotPassword** `/forgot-password` → `app/src/pages/ForgotPassword.tsx`
- **ResetPassword** `/reset-password` → `app/src/pages/ResetPassword.tsx`
- **Dashboard** `/dashboard` (auth) → `app/src/pages/Dashboard.tsx`
- **Contracts** `/contracts` (auth) → `app/src/pages/Contracts.tsx`
- **ContractDetail** `/contracts/:id` (auth) → `app/src/pages/ContractDetail.tsx`
- **Templates** `/templates` (auth) → `app/src/pages/Templates.tsx`
- **Settings** `/settings` (auth) → `app/src/pages/Settings.tsx`
- **NewContract** `/contracts/new` (auth) → `app/src/pages/NewContract.tsx`
- **TemplateEditor** `/templates/:id` (auth) → `app/src/pages/TemplateEditor.tsx`
- **Counterparties** `/counterparties` (auth) → `app/src/pages/Counterparties.tsx`
- **Reports** `/reports` (auth) → `app/src/pages/Reports.tsx`
- **Notifications** `/notifications` (auth) → `app/src/pages/Notifications.tsx`

## Subscription tiers

free / pro / team — gated by: maxContracts, maxSignatures, maxTemplates, advancedFeatures, canExport, retentionDays

## Integrations (22 @molecule/* packages)

- **Auth & permissions**: `@molecule/api-permissions-custom`
- **Database**: `@molecule/api-database-postgresql`
- **Domain resources**: `@molecule/api-resource-user`, `@molecule/api-resource-activity-feed`, `@molecule/api-resource-payment`
- **Email**: `@molecule/api-emails-mailgun`, `@molecule/api-email-templates`
- **Frontend / UI**: `@molecule/app-data-table`, `@molecule/app-file-upload`, `@molecule/app-date-range-picker`, `@molecule/app-command-palette`, `@molecule/app-sidebar-layout-react`, `@molecule/app-notification-feed-react`
- **Other API**: `@molecule/api-audit-database`, `@molecule/api-pdf-pdfkit`, `@molecule/api-cron-node-cron`, `@molecule/api-reporting-database`
- **Payments & billing**: `@molecule/api-payments-stripe`, `@molecule/api-entitlements`, `@molecule/app-billing-react`
- **Search**: `@molecule/api-search-meilisearch`
- **Uploads & media**: `@molecule/api-uploads-s3`

## Required secrets

- DATABASE_URL — PostgreSQL connection string
- MEILISEARCH_API_KEY — MeiliSearch API key
- S3_BUCKET — S3 bucket for contract files
- MAILGUN_API_KEY — Mailgun API key
- MAILGUN_DOMAIN — Mailgun sending domain
- STRIPE_SECRET_KEY — Stripe secret API key (sk_test_... in test mode)
- STRIPE_WEBHOOK_SECRET — Stripe webhook signing secret (whsec_...)
