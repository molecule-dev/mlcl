# AI Customer Service Bot

- **slug**: `ai-customer-service-bot`
- **cluster**: ai-first
- **type**: full-stack
- **layout**: chat

FAQ chatbot with knowledge base, escalation, and learning from conversations

> **This is a complete, working app, already built.** The data model, handlers, and screens below all exist on disk (paths shown). Treat this as the user's existing codebase: **adapt the listed files in place** for the request; do not recreate tables, handlers, or pages that already exist, and do not add packages for functionality already implemented here.

## Features

`auth`, `ai-chat`, `knowledge-base`, `escalation`, `analytics`

## Data model (13 domain tables)

_Already created by the existing SQL in `api/migrations/` — do NOT add new migrations for these tables._

- **conversations** — id, owner_id, end_user_id, customer_name, customer_email, channel, status, escalated, sentiment_score, csat, satisfaction_score, message_count, …
- **messages** — id, conversation_id, sender, role, content, intent_id, model_used, citations_json, latency_ms, created_at, updatedAt
- **knowledge_articles** — id, owner_id, title, slug, content, body_md, category, tags_json, status, embedding_status, version, created_at, …
- **escalations** — id, owner_id, conversation_id, requested_at, agent_assigned_id, accepted_at, resolved_at, summary, created_at, updatedAt
- **feedback** — id, owner_id, conversation_id, message_id, rating, comment, created_at, updatedAt
- **notifications** — id, user_id, kind, type, title, body, link, metadata_json, read_at, created_at, updatedAt
- **user_settings** — id, user_id, bot_tone, auto_escalate, greeting, signature, notify_escalations, notify_mentions, notify_digest, quiet_hours, created_at, updated_at
- **api_tokens** — id, owner_id, label, hashed_token, scopes_json, last_used_at, created_at, revoked_at, updatedAt
- **devices** — id, createdAt, updatedAt, userId, name, pushPlatform, pushSubscription, hasPushSubscription
- **payments** — id, createdAt, updatedAt, userId, transactionId, productId, platformKey, data, receipt
- **threads** — id, title, creatorId, resourceType, resourceId, closed, createdAt, updatedAt
- **thread_messages** — id, threadId, userId, body, editedAt, createdAt, updatedAt
- **thread_read_status** — threadId, userId, lastReadMessageId, updatedAt

## API surface (handlers)

_These endpoints already exist — open and extend the named file, never recreate it._

- **analytics** — `api/src/handlers/analytics.ts`
- **api-tokens** — `api/src/handlers/api-tokens.ts`
- **conversations** — `api/src/handlers/conversations.ts`
- **escalations** — `api/src/handlers/escalations.ts`
- **feedback** — `api/src/handlers/feedback.ts`
- **knowledge** — `api/src/handlers/knowledge.ts`
- **notifications** — `api/src/handlers/notifications.ts`
- **reset-password** — `api/src/handlers/reset-password.ts`
- **settings** — `api/src/handlers/settings.ts`

## Screens (14)

_These pages already exist — edit the named file in place, never create a parallel one._

- **Login** `/login` → `app/src/pages/Login.tsx`
- **Signup** `/signup` → `app/src/pages/Signup.tsx`
- **ForgotPassword** `/forgot-password` → `app/src/pages/ForgotPassword.tsx`
- **ResetPassword** `/reset-password` → `app/src/pages/ResetPassword.tsx`
- **Dashboard** `/dashboard` (auth) → `app/src/pages/Dashboard.tsx`
- **Landing** `/` → `app/src/pages/Landing.tsx`
- **Conversations** `/conversations` (auth) → `app/src/pages/Conversations.tsx`
- **ConversationDetail** `/conversations/:id` (auth) → `app/src/pages/ConversationDetail.tsx`
- **KnowledgeBase** `/knowledge` (auth) → `app/src/pages/KnowledgeBase.tsx`
- **KnowledgeArticleDetail** `/knowledge/:id` (auth) → `app/src/pages/KnowledgeArticleDetail.tsx`
- **Analytics** `/analytics` (auth) → `app/src/pages/Analytics.tsx`
- **Settings** `/settings` (auth) → `app/src/pages/Settings.tsx`
- **Profile** `/profile` (auth) → `app/src/pages/Profile.tsx`
- **Notifications** `/notifications` (auth) → `app/src/pages/Notifications.tsx`

## Subscription tiers

free / pro / team — gated by: maxConversations, maxKnowledge, advancedFeatures, canExport, retentionDays

## Integrations (13 @molecule/* packages)

- **AI**: `@molecule/api-ai-anthropic`, `@molecule/api-ai-rag`, `@molecule/api-ai-embeddings-openai`, `@molecule/api-ai-vector-store-pgvector`, `@molecule/api-ai-agents`, `@molecule/app-ai-assistant`, `@molecule/app-ai-copilot`
- **Database**: `@molecule/api-database-postgresql`
- **Domain resources**: `@molecule/api-resource-user`, `@molecule/api-resource-thread`
- **Frontend / UI**: `@molecule/app-data-table`
- **Realtime**: `@molecule/api-realtime-socketio`, `@molecule/app-realtime-socketio`

## Required secrets

- DATABASE_URL — PostgreSQL connection string
- ANTHROPIC_API_KEY — Anthropic API key for Claude
- OPENAI_API_KEY — OpenAI API key for embeddings
