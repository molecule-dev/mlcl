# Customer Support Chat

- **slug**: `customer-support-chat`
- **cluster**: communication
- **type**: full-stack
- **layout**: dashboard

Intercom-like support widget with live chat, chatbot, canned responses, and agent dashboard

> **This is a complete, working app, already built.** The data model, handlers, and screens below all exist on disk (paths shown). Treat this as the user's existing codebase: **adapt the listed files in place** for the request; do not recreate tables, handlers, or pages that already exist, and do not add packages for functionality already implemented here.

## Features

`auth`, `realtime`, `search`, `ai-bot`, `canned-responses`, `notifications`

## Data model (12 domain tables)

_Already created by the existing SQL in `api/migrations/` — do NOT add new migrations for these tables._

- **activities** — id, actorId, action, resourceType, resourceId, metadata, createdAt
- **activity_seen_status** — userId, lastSeenActivityId, updatedAt
- **automation_rules** — id, workspace_id, name, trigger, conditions, actions, enabled, created_by, user_id, created_at, updated_at, updatedAt
- **canned_responses** — id, workspace_id, title, shortcut, content, category, created_by, user_id, created_at, updated_at, updatedAt
- **contacts** — id, workspace_id, email, name, phone, company, tags, total_conversations, first_seen_at, last_seen_at, user_id, created_at, …
- **devices** — id, createdAt, updatedAt, userId, name, pushPlatform, pushSubscription, hasPushSubscription
- **payments** — id, createdAt, updatedAt, userId, transactionId, productId, platformKey, data, receipt
- **resource_tags** — id, tagId, resourceType, resourceId, createdAt
- **support_agents** — id, user_id, status, current_conversation_count, avg_response_time_ms, csat_score, created_at, updated_at, updatedAt
- **support_conversations** — id, workspace_id, visitor_id, visitor_name, visitor_email, subject, status, priority, agent_id, user_id, assigned_at, closed_at, …
- **support_messages** — id, conversation_id, sender_type, sender_id, sender_name, content, type, user_id, created_at, updated_at, updatedAt
- **tags** — id, name, slug, color, description, createdAt, updatedAt

## API surface (handlers)

_These endpoints already exist — open and extend the named file, never recreate it._

- **agents** — `api/src/handlers/agents.ts`
- **automations** — `api/src/handlers/automations.ts`
- **canned-responses** — `api/src/handlers/canned-responses.ts`
- **contacts** — `api/src/handlers/contacts.ts`
- **conversations** — `api/src/handlers/conversations.ts`
- **messages** — `api/src/handlers/messages.ts`

## Screens (13)

_These pages already exist — edit the named file in place, never create a parallel one._

- **Landing** `/` → `app/src/pages/Landing.tsx`
- **Login** `/login` → `app/src/pages/Login.tsx`
- **Signup** `/signup` → `app/src/pages/Signup.tsx`
- **ForgotPassword** `/forgot-password` → `app/src/pages/ForgotPassword.tsx`
- **ResetPassword** `/reset-password` → `app/src/pages/ResetPassword.tsx`
- **Inbox** `/inbox` (auth) → `app/src/pages/Inbox.tsx`
- **ConversationDetail** `/conversation/:id` (auth) → `app/src/pages/ConversationDetail.tsx`
- **Contacts** `/contacts` (auth) → `app/src/pages/Contacts.tsx`
- **Reports** `/reports` (auth) → `app/src/pages/Reports.tsx`
- **Automations** `/automations` (auth) → `app/src/pages/Automations.tsx`
- **Settings** `/settings` (auth) → `app/src/pages/Settings.tsx`
- **ContactDetail** `/contacts/:id` (auth) → `app/src/pages/ContactDetail.tsx`
- **Notifications** `/notifications` (auth) → `app/src/pages/Notifications.tsx`

## Subscription tiers

free / pro / team — gated by: maxAgents, maxCannedResponses, maxConversations, maxMessages, advancedFeatures, canExport, retentionDays

## Integrations (14 @molecule/* packages)

- **AI**: `@molecule/api-ai-anthropic`
- **Database**: `@molecule/api-database-postgresql`
- **Domain resources**: `@molecule/api-resource-user`, `@molecule/api-resource-tag`, `@molecule/api-resource-activity-feed`
- **Email**: `@molecule/api-emails-mailgun`
- **Frontend / UI**: `@molecule/app-virtual-scroll`, `@molecule/app-data-table`, `@molecule/app-command-palette`, `@molecule/app-keyboard-shortcuts`
- **Notifications**: `@molecule/api-push-notifications-web-push`
- **Realtime**: `@molecule/api-realtime-socketio`, `@molecule/app-realtime-socketio`
- **Search**: `@molecule/api-search-meilisearch`

## Required secrets

- DATABASE_URL — PostgreSQL connection string
- MAILGUN_API_KEY — Mailgun API key for ticket notifications
- ANTHROPIC_API_KEY — Anthropic API key for AI chatbot
