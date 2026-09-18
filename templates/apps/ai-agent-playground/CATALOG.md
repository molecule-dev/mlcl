# AI Agent Playground

- **slug**: `ai-agent-playground`
- **cluster**: ai-first
- **type**: full-stack
- **layout**: dashboard

Build, test, and deploy AI agents with tools, multi-provider support, and execution history

> **This is a complete, working app, already built.** The data model, handlers, and screens below all exist on disk (paths shown). Treat this as the user's existing codebase: **adapt the listed files in place** for the request; do not recreate tables, handlers, or pages that already exist, and do not add packages for functionality already implemented here.

## Features

`auth`, `ai-agents`, `code-editing`, `execution-history`, `multi-provider`

## Data model (14 domain tables)

_Already created by the existing SQL in `api/migrations/` — do NOT add new migrations for these tables._

- **agent_executions** — id, user_id, agent_id, status, input, output, final_output, tool_calls, model, provider, total_tokens, token_count, …
- **agent_tools** — id, agent_id, tool_id, user_id, config_json, position, created_at
- **agents** — id, user_id, name, description, provider, model, temperature, max_tokens, system_prompt, tools_config, status, run_count, …
- **api_credentials** — id, user_id, provider, encrypted_key, label, last_used_at, created_at, updated_at
- **dataset_rows** — id, dataset_id, user_id, input_json, expected_output, position, created_at
- **datasets** — id, user_id, name, description, row_count, format, created_at, updated_at
- **devices** — id, createdAt, updatedAt, userId, name, pushPlatform, pushSubscription, hasPushSubscription
- **execution_steps** — id, execution_id, user_id, step_index, kind, tool_id, request_json, response_json, latency_ms, tokens, cost_cents, created_at
- **knowledge_bases** — id, user_id, name, description, embedding_model, document_count, ingested_at, created_at, updated_at
- **knowledge_documents** — id, knowledge_base_id, user_id, source_type, source_url, title, chunk_count, status, created_at, updated_at
- **notifications** — id, user_id, kind, title, body, link, read_at, created_at
- **payments** — id, createdAt, updatedAt, userId, transactionId, productId, platformKey, data, receipt
- **tools** — id, user_id, name, description, type, schema_json, handler_config_json, created_at, updated_at
- **user_preferences** — id, user_id, data, created_at, updated_at

## API surface (handlers)

_These endpoints already exist — open and extend the named file, never recreate it._

- **agents** — `api/src/handlers/agents.ts`
- **api-credentials** — `api/src/handlers/api-credentials.ts`
- **datasets** — `api/src/handlers/datasets.ts`
- **executions** — `api/src/handlers/executions.ts`
- **knowledge-bases** — `api/src/handlers/knowledge-bases.ts`
- **notifications** — `api/src/handlers/notifications.ts`
- **tools** — `api/src/handlers/tools.ts`
- **user-preferences** — `api/src/handlers/user-preferences.ts`

## Screens (18)

_These pages already exist — edit the named file in place, never create a parallel one._

- **Login** `/login` → `app/src/pages/Login.tsx`
- **Signup** `/signup` → `app/src/pages/Signup.tsx`
- **ForgotPassword** `/forgot-password` → `app/src/pages/ForgotPassword.tsx`
- **ResetPassword** `/reset-password` → `app/src/pages/ResetPassword.tsx`
- **Dashboard** `/dashboard` (auth) → `app/src/pages/Dashboard.tsx`
- **Landing** `/` → `app/src/pages/Landing.tsx`
- **AgentBuilder** `/agents/:id` (auth) → `app/src/pages/AgentBuilder.tsx`
- **ExecutionTrace** `/runs/:id` (auth) → `app/src/pages/ExecutionTrace.tsx`
- **ToolLibrary** `/tools` (auth) → `app/src/pages/ToolLibrary.tsx`
- **PromptEditor** `/agents/:id/prompt` (auth) → `app/src/pages/PromptEditor.tsx`
- **Settings** `/settings` (auth) → `app/src/pages/Settings.tsx`
- **Agents** `/agents` (auth) → `app/src/pages/Agents.tsx`
- **RunHistory** `/runs` (auth) → `app/src/pages/RunHistory.tsx`
- **Datasets** `/datasets` (auth) → `app/src/pages/Datasets.tsx`
- **KnowledgeBases** `/knowledge-bases` (auth) → `app/src/pages/KnowledgeBases.tsx`
- **Models** `/models` (auth) → `app/src/pages/Models.tsx`
- **Profile** `/profile` (auth) → `app/src/pages/Profile.tsx`
- **Notifications** `/notifications` (auth) → `app/src/pages/Notifications.tsx`

## Subscription tiers

free / pro / team — gated by: maxAgents, maxExecutions, advancedFeatures, canExport, retentionDays

## Integrations (9 @molecule/* packages)

- **AI**: `@molecule/api-ai-anthropic`, `@molecule/api-ai-openai`, `@molecule/api-ai-agents`, `@molecule/app-ai-assistant`
- **Database**: `@molecule/api-database-postgresql`
- **Domain resources**: `@molecule/api-resource-user`
- **Frontend / UI**: `@molecule/app-code-editor`, `@molecule/app-timeline`, `@molecule/app-data-table`

## Required secrets

- DATABASE_URL — PostgreSQL connection string
- ANTHROPIC_API_KEY — Anthropic API key for Claude models
- OPENAI_API_KEY — OpenAI API key for GPT models
