# CRM

- **slug**: `crm`
- **cluster**: business-saas
- **type**: full-stack
- **layout**: dashboard

Salesforce-like CRM with contacts, deals, pipeline, and activities — including a built-in subscription tier (Free / Pro / Team) backed by Stripe

> **This is a complete, working app, already built.** The data model, handlers, and screens below all exist on disk (paths shown). Treat this as the user's existing codebase: **adapt the listed files in place** for the request; do not recreate tables, handlers, or pages that already exist, and do not add packages for functionality already implemented here.

## Features

`auth`, `search`, `pipeline`, `contacts`, `deals`, `activities`, `import-export`, `subscriptions`

## Data model (10 domain tables)

_Already created by the existing SQL in `api/migrations/` — do NOT add new migrations for these tables._

- **activities** — id, owner_id, type, subject, description, contact_id, deal_id, company_id, due_date, completed, created_at, updated_at, …
- **activity_seen_status** — userId, lastSeenActivityId, updatedAt
- **comments** — id, resourceType, resourceId, userId, parentId, body, editedAt, createdAt, updatedAt
- **companies** — id, owner_id, name, domain, industry, size, phone, address, created_at, updated_at, updatedAt
- **contacts** — id, owner_id, user_id, first_name, last_name, email, phone, company_id, title, source, created_at, updated_at, …
- **deals** — id, owner_id, title, value, currency, stage, probability, contact_id, company_id, expected_close_date, created_at, updated_at, …
- **devices** — id, createdAt, updatedAt, userId, name, pushPlatform, pushSubscription, hasPushSubscription
- **resource_tags** — id, tagId, resourceType, resourceId, createdAt
- **tags** — id, name, slug, color, description, createdAt, updatedAt
- **payments** — id, createdAt, updatedAt, userId, transactionId, productId, platformKey, data, receipt

## API surface (handlers)

_These endpoints already exist — open and extend the named file, never recreate it._

- **activities** — `api/src/handlers/activities.ts`
- **companies** — `api/src/handlers/companies.ts`
- **contacts** — `api/src/handlers/contacts.ts`
- **deals** — `api/src/handlers/deals.ts`
- **pipeline** — `api/src/handlers/pipeline.ts`

## Screens (14)

_These pages already exist — edit the named file in place, never create a parallel one._

- **Dashboard** `/` (auth) → `app/src/pages/Dashboard.tsx`
- **Contacts** `/contacts` (auth) → `app/src/pages/Contacts.tsx`
- **ContactDetail** `/contacts/:id` (auth) → `app/src/pages/ContactDetail.tsx`
- **Companies** `/companies` (auth) → `app/src/pages/Companies.tsx`
- **CompanyDetail** `/companies/:id` (auth) → `app/src/pages/CompanyDetail.tsx`
- **Deals** `/deals` (auth) → `app/src/pages/Deals.tsx`
- **DealDetail** `/deals/:id` (auth) → `app/src/pages/DealDetail.tsx`
- **Activities** `/activities` (auth) → `app/src/pages/Activities.tsx`
- **Reports** `/reports` (auth) → `app/src/pages/Reports.tsx`
- **Settings** `/settings` (auth) → `app/src/pages/Settings.tsx`
- **Login** `/login` → `app/src/pages/Login.tsx`
- **Signup** `/signup` → `app/src/pages/Signup.tsx`
- **ForgotPassword** `/forgot-password` → `app/src/pages/ForgotPassword.tsx`
- **ResetPassword** `/reset-password` → `app/src/pages/ResetPassword.tsx`

## Subscription tiers

free / pro / team — gated by: maxContacts, maxDeals, maxPipelines, maxActivities, maxCompanies, advancedAnalytics, dataExport, customFields, integrations

## Integrations (23 @molecule/* packages)

- **AI**: `@molecule/api-ai-classification`, `@molecule/api-ai-summarization`
- **Auth & permissions**: `@molecule/api-permissions-custom`
- **Database**: `@molecule/api-database-postgresql`
- **Domain resources**: `@molecule/api-resource-activity-feed`, `@molecule/api-resource-comment`, `@molecule/api-resource-payment`, `@molecule/api-resource-tag`, `@molecule/api-resource-user`
- **Email**: `@molecule/api-email-templates`, `@molecule/api-emails-mailgun`
- **Frontend / UI**: `@molecule/app-calendar`, `@molecule/app-command-palette`, `@molecule/app-data-table`, `@molecule/app-kanban`, `@molecule/app-kpi-card-react`, `@molecule/app-shell-layout-react`
- **Other API**: `@molecule/api-audit-database`, `@molecule/api-import-export-csv`
- **Payments & billing**: `@molecule/api-entitlements`, `@molecule/api-payments-stripe`, `@molecule/app-billing-react`
- **Search**: `@molecule/api-search-meilisearch`

## Required secrets

- DATABASE_URL — PostgreSQL connection string
- MEILISEARCH_API_KEY — MeiliSearch API key
- STRIPE_SECRET_KEY — Stripe secret API key (sk_test_... in test mode)
- STRIPE_WEBHOOK_SECRET — Stripe webhook signing secret (whsec_...)
