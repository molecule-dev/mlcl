# AI Workflow Automator

- **slug**: `ai-workflow-automator`
- **cluster**: ai-first
- **type**: full-stack
- **layout**: dashboard

AI-powered automation rules with triggers, conditions, and multi-step actions

> **This is a complete, working app, already built.** The data model, handlers, and screens below all exist on disk (paths shown). Treat this as the user's existing codebase: **adapt the listed files in place** for the request; do not recreate tables, handlers, or pages that already exist, and do not add packages for functionality already implemented here.

## Features

`auth`, `workflow-builder`, `ai-conditions`, `cron-triggers`, `run-history`, `data-table`

## Data model (10 domain tables)

_Already created by the existing SQL in `api/migrations/` — do NOT add new migrations for these tables._

- **connections** — id, user_id, provider, label, oauth_token_encrypted, api_key_encrypted, scopes, status, last_used_at, created_at, updated_at, updatedAt
- **devices** — id, createdAt, updatedAt, userId, name, pushPlatform, pushSubscription, hasPushSubscription
- **notifications** — id, user_id, kind, title, body, link, read_at, created_at, updatedAt
- **payments** — id, createdAt, updatedAt, userId, transactionId, productId, platformKey, data, receipt
- **webhook_endpoints** — id, workflow_id, slug, hashed_secret, created_at, updatedAt
- **workflow_runs** — id, workflow_id, trigger_source, status, trigger_payload, step_results, error_message, attempt, started_at, finished_at, duration_ms, created_at, …
- **workflow_step_runs** — id, run_id, step_id, status, input, output, error, attempt, started_at, finished_at, duration_ms, created_at, …
- **workflow_steps** — id, workflow_id, position, type, config, parent_step_id, created_at, updated_at, updatedAt
- **workflow_templates** — id, user_id, name, description, category, definition, popularity, created_at, updated_at, updatedAt
- **workflows** — id, user_id, name, description, status, trigger_type, cron_expression, condition_prompt, enabled, run_count, success_count, failure_count, …

## API surface (handlers)

_These endpoints already exist — open and extend the named file, never recreate it._

- **connections** — `api/src/handlers/connections.ts`
- **dashboard** — `api/src/handlers/dashboard.ts`
- **notifications** — `api/src/handlers/notifications.ts`
- **runs** — `api/src/handlers/runs.ts`
- **templates** — `api/src/handlers/templates.ts`
- **workflows** — `api/src/handlers/workflows.ts`

## Screens (16)

_These pages already exist — edit the named file in place, never create a parallel one._

- **Landing** `/` → `app/src/pages/Landing.tsx`
- **Login** `/login` → `app/src/pages/Login.tsx`
- **Signup** `/signup` → `app/src/pages/Signup.tsx`
- **ForgotPassword** `/forgot-password` → `app/src/pages/ForgotPassword.tsx`
- **ResetPassword** `/reset-password` → `app/src/pages/ResetPassword.tsx`
- **Dashboard** `/dashboard` (auth) → `app/src/pages/Dashboard.tsx`
- **WorkflowBuilder** `/workflows/:id` (auth) → `app/src/pages/WorkflowBuilder.tsx`
- **Executions** `/executions` (auth) → `app/src/pages/Executions.tsx`
- **ExecutionDetail** `/executions/:id` (auth) → `app/src/pages/ExecutionDetail.tsx`
- **Templates** `/templates` (auth) → `app/src/pages/Templates.tsx`
- **Settings** `/settings` (auth) → `app/src/pages/Settings.tsx`
- **Workflows** `/workflows` (auth) → `app/src/pages/Workflows.tsx`
- **TemplateDetail** `/templates/:id` (auth) → `app/src/pages/TemplateDetail.tsx`
- **Connections** `/connections` (auth) → `app/src/pages/Connections.tsx`
- **Notifications** `/notifications` (auth) → `app/src/pages/Notifications.tsx`
- **Billing** `/billing` (auth) → `app/src/pages/Billing.tsx`

## Subscription tiers

free / pro / team — gated by: maxRuns, maxWorkflows, advancedFeatures, canExport, retentionDays

## Integrations (8 @molecule/* packages)

- **AI**: `@molecule/api-ai-anthropic`, `@molecule/api-ai-agents`, `@molecule/app-ai-assistant`
- **Database**: `@molecule/api-database-postgresql`
- **Domain resources**: `@molecule/api-resource-user`
- **Frontend / UI**: `@molecule/app-data-table`
- **Other API**: `@molecule/api-workflow-database`, `@molecule/api-cron-node-cron`

## Required secrets

- DATABASE_URL — PostgreSQL connection string
- ANTHROPIC_API_KEY — Anthropic API key for AI condition evaluation
