# AI Chatbot Builder

- **slug**: `ai-chatbot-builder`
- **cluster**: operations-iot
- **type**: full-stack
- **layout**: admin

Botpress-like chatbot builder with conversation flows, intents, training data, and deployment

> **This is a complete, working app, already built.** The data model, handlers, and screens below all exist on disk (paths shown). Treat this as the user's existing codebase: **adapt the listed files in place** for the request; do not recreate tables, handlers, or pages that already exist, and do not add packages for functionality already implemented here.

## Features

`auth`, `search`, `ai`, `rag`, `embeddings`, `conversation-flows`

## Data model (11 domain tables)

_Already created by the existing SQL in `api/migrations/` — do NOT add new migrations for these tables._

- **bots** — id, owner_id, name, description, system_prompt, model, temperature, max_tokens, welcome_message, status, conversation_count, message_count, …
- **conversations** — id, bot_id, visitor_name, status, message_count, created_at, updated_at, updatedAt
- **devices** — id, createdAt, updatedAt, userId, name, pushPlatform, pushSubscription, hasPushSubscription
- **intents** — id, bot_id, name, description, response_template, created_at, updated_at, updatedAt
- **knowledge_documents** — id, bot_id, title, content, source_url, status, created_at, updated_at, updatedAt
- **messages** — id, conversation_id, bot_id, role, content, tokens_used, created_at, updatedAt
- **thread_messages** — id, threadId, userId, body, editedAt, createdAt, updatedAt
- **thread_read_status** — threadId, userId, lastReadMessageId, updatedAt
- **threads** — id, title, creatorId, resourceType, resourceId, closed, createdAt, updatedAt
- **training_examples** — id, intent_id, text, created_at, updatedAt
- **notifications** — id, user_id, owner_id, createdAt, kind, title, body, link, read_at

## API surface (handlers)

_These endpoints already exist — open and extend the named file, never recreate it._

- **bots** — `api/src/handlers/bots.ts`
- **conversations** — `api/src/handlers/conversations.ts`
- **intents** — `api/src/handlers/intents.ts`
- **notifications** — `api/src/handlers/notifications.ts`
- **profile** — `api/src/handlers/profile.ts`
- **training** — `api/src/handlers/training.ts`

## Screens (14)

_These pages already exist — edit the named file in place, never create a parallel one._

- **Dashboard** `/` (auth) → `app/src/pages/Dashboard.tsx`
- **BotsList** `/bots` (auth) → `app/src/pages/BotsList.tsx`
- **BotEditor** `/bots/:id/editor` (auth) → `app/src/pages/BotEditor.tsx`
- **BotAnalytics** `/bots/:id/analytics` (auth) → `app/src/pages/BotAnalytics.tsx`
- **BotSettings** `/bots/:id/settings` (auth) → `app/src/pages/BotSettings.tsx`
- **BotDeploy** `/bots/:id/deploy` (auth) → `app/src/pages/BotDeploy.tsx`
- **Integrations** `/integrations` (auth) → `app/src/pages/Integrations.tsx`
- **KnowledgeBase** `/knowledge-base` (auth) → `app/src/pages/KnowledgeBase.tsx`
- **TestChat** `/test-chat` (auth) → `app/src/pages/TestChat.tsx`
- **Settings** `/settings` (auth) → `app/src/pages/Settings.tsx`
- **Login** `/login` → `app/src/pages/Login.tsx`
- **Signup** `/signup` → `app/src/pages/Signup.tsx`
- **ForgotPassword** `/forgot-password` → `app/src/pages/ForgotPassword.tsx`
- **ResetPassword** `/reset-password` → `app/src/pages/ResetPassword.tsx`

## Subscription tiers

free / pro / team — gated by: maxBots, maxAiMessagesPerMonth, maxIntents, maxConversationsRetained, maxTrainingDocsMb, customModelsAllowed, integrations, sentiment, multilingual, advancedAnalytics

## Integrations (14 @molecule/* packages)

- **AI**: `@molecule/api-ai-anthropic`, `@molecule/api-ai-openai`, `@molecule/api-ai-agents`, `@molecule/api-ai-rag`, `@molecule/api-ai-embeddings-openai`, `@molecule/api-ai-vector-store-pgvector`, `@molecule/app-ai-assistant`, `@molecule/app-ai-copilot`
- **Database**: `@molecule/api-database-postgresql`
- **Domain resources**: `@molecule/api-resource-user`, `@molecule/api-resource-thread`
- **Frontend / UI**: `@molecule/app-data-table`, `@molecule/app-command-palette`
- **Search**: `@molecule/api-search-meilisearch`

## Required secrets

- DATABASE_URL — PostgreSQL connection string
- ANTHROPIC_API_KEY — Anthropic API key
- OPENAI_API_KEY — OpenAI API key for embeddings
- MEILISEARCH_API_KEY — MeiliSearch API key
