# Helpdesk / Ticketing

- **slug**: `helpdesk-ticketing`
- **cluster**: business-saas
- **type**: full-stack
- **layout**: dashboard

Zendesk-like support system with tickets, SLA, and knowledge base

> **This is a complete, working app, already built.** The data model, handlers, and screens below all exist on disk (paths shown). Treat this as the user's existing codebase: **adapt the listed files in place** for the request; do not recreate tables, handlers, or pages that already exist, and do not add packages for functionality already implemented here.

## Features

`auth`, `search`, `tickets`, `sla`, `knowledge-base`, `macros`, `email-notifications`

## Data model (12 domain tables)

_Already created by the existing SQL in `api/migrations/` — do NOT add new migrations for these tables._

- **activities** — id, actorId, action, resourceType, resourceId, metadata, createdAt
- **activity_seen_status** — userId, lastSeenActivityId, updatedAt
- **comments** — id, resourceType, resourceId, userId, parentId, body, editedAt, createdAt, updatedAt
- **devices** — id, createdAt, updatedAt, userId, name, pushPlatform, pushSubscription, hasPushSubscription
- **kb_articles** — id, title, body, category, status, author_id, created_at, updated_at, updatedAt
- **macros** — id, name, description, actions, reply_template, created_by, created_at, updatedAt
- **resource_tags** — id, tagId, resourceType, resourceId, createdAt
- **sla_policies** — id, name, description, first_response_hours, resolution_hours, priority, active, created_at, updatedAt
- **tags** — id, name, slug, color, description, createdAt, updatedAt
- **ticket_replies** — id, ticket_id, body, is_internal, author_id, created_at, updatedAt
- **tickets** — id, subject, description, status, priority, category, assignee_id, requester_id, user_id, created_at, updated_at, updatedAt
- **payments** — id, createdAt, updatedAt, userId, transactionId, productId, platformKey, data, receipt

## API surface (handlers)

_These endpoints already exist — open and extend the named file, never recreate it._

- **\_test** — `api/src/handlers/_test.ts`
- **articles** — `api/src/handlers/articles.ts`
- **macros** — `api/src/handlers/macros.ts`
- **sla** — `api/src/handlers/sla.ts`
- **tickets** — `api/src/handlers/tickets.ts`
- **users-me** — `api/src/handlers/users-me.ts`

## Screens (10)

_These pages already exist — edit the named file in place, never create a parallel one._

- **Dashboard** `/` (auth) → `app/src/pages/Dashboard.tsx`
- **ForgotPassword** `/forgot-password` → `app/src/pages/ForgotPassword.tsx`
- **KnowledgeBase** `/knowledge-base` (auth) → `app/src/pages/KnowledgeBase.tsx`
- **Login** `/login` → `app/src/pages/Login.tsx`
- **Reports** `/reports` (auth) → `app/src/pages/Reports.tsx`
- **ResetPassword** `/reset-password` → `app/src/pages/ResetPassword.tsx`
- **Settings** `/settings` (auth) → `app/src/pages/Settings.tsx`
- **Signup** `/signup` → `app/src/pages/Signup.tsx`
- **TicketDetail** `/tickets/:id` (auth) → `app/src/pages/TicketDetail.tsx`
- **Tickets** `/tickets` (auth) → `app/src/pages/Tickets.tsx`

## Subscription tiers

free / pro / team — gated by: maxOpenTickets, maxAgents, maxKbArticles, maxMacros, slaTracking, customFields, automation, satisfactionSurveys, multiBrand

## Integrations (14 @molecule/* packages)

- **AI**: `@molecule/api-ai-classification`, `@molecule/api-ai-summarization`
- **Auth & permissions**: `@molecule/api-permissions-custom`
- **Database**: `@molecule/api-database-postgresql`
- **Domain resources**: `@molecule/api-resource-user`, `@molecule/api-resource-comment`, `@molecule/api-resource-tag`, `@molecule/api-resource-activity-feed`
- **Email**: `@molecule/api-emails-mailgun`
- **Frontend / UI**: `@molecule/app-data-table`, `@molecule/app-markdown`, `@molecule/app-command-palette`
- **Other API**: `@molecule/api-workflow-database`
- **Search**: `@molecule/api-search-meilisearch`

## Required secrets

- DATABASE_URL — PostgreSQL connection string
- MEILISEARCH_API_KEY — MeiliSearch API key
- MAILGUN_API_KEY — Mailgun API key for notifications
- MAILGUN_DOMAIN — Mailgun sending domain
