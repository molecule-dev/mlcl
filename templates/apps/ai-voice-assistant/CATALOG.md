# AI Voice Assistant

- **slug**: `ai-voice-assistant`
- **cluster**: ai-first
- **type**: full-stack
- **layout**: chat

Speech-to-text, AI processing, and text-to-speech voice assistant

> **This is a complete, working app, already built.** The data model, handlers, and screens below all exist on disk (paths shown). Treat this as the user's existing codebase: **adapt the listed files in place** for the request; do not recreate tables, handlers, or pages that already exist, and do not add packages for functionality already implemented here.

## Features

`auth`, `speech-to-text`, `text-to-speech`, `ai-agents`, `realtime`

## Data model (11 domain tables)

_Already created by the existing SQL in `api/migrations/` — do NOT add new migrations for these tables._

- **agents** — id, user_id, name, system_prompt, model, voice_id, tools, persona_avatar_url, created_at, updated_at
- **api_credentials** — id, user_id, provider, encrypted_key, label, last_used_at, created_at, updated_at
- **conversations** — id, user_id, agent_id, title, mode, message_count, total_seconds_spoken, started_at, ended_at, created_at, updated_at
- **devices** — id, createdAt, updatedAt, userId, name, pushPlatform, pushSubscription, hasPushSubscription
- **messages** — id, conversation_id, role, content, type, audio_s3_key, duration_ms, latency_ms, tokens_used, created_at
- **notifications** — id, user_id, kind, title, body, link, read_at, created_at
- **payments** — id, createdAt, updatedAt, userId, transactionId, productId, platformKey, data, receipt
- **thread_messages** — id, threadId, userId, body, editedAt, createdAt, updatedAt
- **thread_read_status** — threadId, userId, lastReadMessageId, updatedAt
- **threads** — id, title, creatorId, resourceType, resourceId, closed, createdAt, updatedAt
- **voice_presets** — id, user_id, provider, provider_voice_id, name, sample_url, created_at

## API surface (handlers)

_These endpoints already exist — open and extend the named file, never recreate it._

- **agents** — `api/src/handlers/agents.ts`
- **conversations** — `api/src/handlers/conversations.ts`
- **preferences** — `api/src/handlers/preferences.ts`
- **profile** — `api/src/handlers/profile.ts`
- **speech** — `api/src/handlers/speech.ts`

## Screens (14)

_These pages already exist — edit the named file in place, never create a parallel one._

- **Landing** `/` → `app/src/pages/Landing.tsx`
- **Login** `/login` → `app/src/pages/Login.tsx`
- **Signup** `/signup` → `app/src/pages/Signup.tsx`
- **ForgotPassword** `/forgot-password` → `app/src/pages/ForgotPassword.tsx`
- **ResetPassword** `/reset-password` → `app/src/pages/ResetPassword.tsx`
- **Conversation** `/conversation` (auth) → `app/src/pages/Conversation.tsx`
- **History** `/history` (auth) → `app/src/pages/History.tsx`
- **ConversationDetail** `/history/:id` (auth) → `app/src/pages/ConversationDetail.tsx`
- **Agents** `/agents` (auth) → `app/src/pages/Agents.tsx`
- **Settings** `/settings` (auth) → `app/src/pages/Settings.tsx`
- **AgentDetail** `/agents/:id` (auth) → `app/src/pages/AgentDetail.tsx`
- **Billing** `/settings/billing` (auth) → `app/src/pages/Billing.tsx`
- **Search** `/search` (auth) → `app/src/pages/Search.tsx`
- **Profile** `/profile` (auth) → `app/src/pages/Profile.tsx`

## Subscription tiers

free / pro / team — gated by: maxConversations, maxSpeech, advancedFeatures, canExport, retentionDays

## Integrations (12 @molecule/* packages)

- **AI**: `@molecule/api-ai-anthropic`, `@molecule/api-ai-agents`, `@molecule/api-ai-speech-openai`, `@molecule/api-ai-speech-elevenlabs`, `@molecule/app-ai-voice`, `@molecule/app-ai-assistant`
- **Database**: `@molecule/api-database-postgresql`
- **Domain resources**: `@molecule/api-resource-user`, `@molecule/api-resource-thread`
- **Frontend / UI**: `@molecule/app-timeline`
- **Realtime**: `@molecule/api-realtime-socketio`, `@molecule/app-realtime-socketio`

## Required secrets

- DATABASE_URL — PostgreSQL connection string
- ANTHROPIC_API_KEY — Anthropic API key for Claude
- OPENAI_API_KEY — OpenAI API key for Whisper STT
