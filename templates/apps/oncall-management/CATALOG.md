# Oncall Management

- **slug**: `oncall-management`
- **cluster**: operations-iot
- **type**: full-stack
- **layout**: dashboard

PagerDuty-like on-call management with rotation schedules, escalation policies, incident alerting, acknowledge/resolve workflow, and postmortems — with built-in Stripe-backed subscription tiers

> **This is a complete, working app, already built.** The data model, handlers, and screens below all exist on disk (paths shown). Treat this as the user's existing codebase: **adapt the listed files in place** for the request; do not recreate tables, handlers, or pages that already exist, and do not add packages for functionality already implemented here.

## Features

`auth`, `notifications`, `search`, `subscriptions`

## Data model (17 domain tables)

_Already created by the existing SQL in `api/migrations/` — do NOT add new migrations for these tables._

- **devices** — id, createdAt, updatedAt, userId, name, pushPlatform, pushSubscription, hasPushSubscription
- **notifications** — id, createdAt, updatedAt, user_id, kind, severity, title, detail, href, read, created_at
- **team_members** — id, user_id, member_id, name, email, role, timezone, oncall, member_status, assigned_incidents, acked_30d, resolved_30d, …
- **team_invites** — id, user_id, email, role, status, created_at
- **user_api_keys** — id, user_id, name, prefix, last_used_at, last_used_label, created_at, revoked_at
- **user_sessions_view** — id, user_id, user_agent, ip_address, city, is_current, last_seen_at, created_at
- **connected_accounts** — id, user_id, provider, provider_username, connected, connected_at
- **org_settings** — id, user_id, org_name, region, retention_days, created_at, updated_at
- **org_integrations** — id, user_id, name, detail, connected, created_at
- **schedules** — id, user_id, name, description, timezone, rotation_type, handoff_time, members, is_active, created_at, updated_at
- **schedule_shifts** — id, user_id, schedule_id, member_id, start_at, end_at, is_override, note, created_at
- **escalation_policies** — id, user_id, name, description, repeat_cycles, is_active, created_at, updated_at
- **escalation_rules** — id, user_id, policy_id, position, notify_member_id, notify_channel, wait_minutes, created_at
- **incidents** — id, user_id, title, description, severity, status, service, assigned_member_id, escalation_policy_id, schedule_id, escalation_level, triggered_at, …
- **incident_events** — id, user_id, incident_id, kind, actor, text, at, created_at
- **postmortems** — id, user_id, incident_id, title, summary, contributing_factors, status, created_at, updated_at
- **postmortem_action_items** — id, user_id, postmortem_id, description, owner_member_id, status, due_at, created_at, updated_at

## API surface (handlers)

_These endpoints already exist — open and extend the named file, never recreate it._

- **\_roster** — `api/src/handlers/_roster.ts`
- **\_seed** — `api/src/handlers/_seed.ts`
- **escalation-policies** — `api/src/handlers/escalation-policies.ts`
- **incidents** — `api/src/handlers/incidents.ts`
- **notifications** — `api/src/handlers/notifications.ts`
- **overview** — `api/src/handlers/overview.ts`
- **postmortems** — `api/src/handlers/postmortems.ts`
- **profile** — `api/src/handlers/profile.ts`
- **schedules** — `api/src/handlers/schedules.ts`
- **settings** — `api/src/handlers/settings.ts`
- **team** — `api/src/handlers/team.ts`

## Screens (23)

_These pages already exist — edit the named file in place, never create a parallel one._

- **Landing** `/` → `app/src/pages/Landing.tsx`
- **Login** `/login` → `app/src/pages/Login.tsx`
- **Signup** `/signup` → `app/src/pages/Signup.tsx`
- **ForgotPassword** `/forgot-password` → `app/src/pages/ForgotPassword.tsx`
- **ResetPassword** `/reset-password` → `app/src/pages/ResetPassword.tsx`
- **Dashboard** `/dashboard` (auth) → `app/src/pages/Dashboard.tsx`
- **Incidents** `/incidents` (auth) → `app/src/pages/Incidents.tsx`
- **IncidentDetail** `/incidents/:id` (auth) → `app/src/pages/IncidentDetail.tsx`
- **Schedules** `/schedules` (auth) → `app/src/pages/Schedules.tsx`
- **ScheduleDetail** `/schedules/:id` (auth) → `app/src/pages/ScheduleDetail.tsx`
- **EscalationPolicies** `/escalation-policies` (auth) → `app/src/pages/EscalationPolicies.tsx`
- **Postmortems** `/postmortems` (auth) → `app/src/pages/Postmortems.tsx`
- **PostmortemDetail** `/postmortems/:id` (auth) → `app/src/pages/PostmortemDetail.tsx`
- **Team** `/team` (auth) → `app/src/pages/Team.tsx`
- **Notifications** `/notifications` (auth) → `app/src/pages/Notifications.tsx`
- **Settings** `/settings` (auth) → `app/src/pages/Settings.tsx`
- **Profile** `/profile` (auth) → `app/src/pages/Profile.tsx`
- **Pricing** `/pricing` → `app/src/pages/Pricing.tsx`
- **PlanUpdated** `/plan-updated` (auth) → `app/src/pages/PlanUpdated.tsx`
- **About** `/about` → `app/src/pages/About.tsx`
- **Privacy** `/privacy` → `app/src/pages/Privacy.tsx`
- **Terms** `/terms` → `app/src/pages/Terms.tsx`
- **NotFound** `/404` → `app/src/pages/NotFound.tsx`

## Subscription tiers

free / pro / team — gated by: maxPolicies, maxSchedules, maxOpenIncidents, maxPostmortems, advancedFeatures, canExport, retentionDays

## Integrations (18 @molecule/* packages)

- **Database**: `@molecule/api-database-postgresql`
- **Domain resources**: `@molecule/api-resource-user`, `@molecule/api-resource-notification`, `@molecule/api-resource-payment`
- **Email**: `@molecule/api-emails-mailgun`, `@molecule/api-email-templates`
- **Frontend / UI**: `@molecule/app-data-table`, `@molecule/app-virtual-scroll`, `@molecule/app-command-palette`, `@molecule/app-keyboard-shortcuts`, `@molecule/app-charts`
- **Notifications**: `@molecule/api-notifications-webhook`
- **Other API**: `@molecule/api-cron-node-cron`, `@molecule/api-reporting-database`
- **Payments & billing**: `@molecule/api-payments-stripe`, `@molecule/api-entitlements`, `@molecule/app-billing-react`
- **Search**: `@molecule/api-search-meilisearch`

## Required secrets

- DATABASE_URL — PostgreSQL connection string
- STRIPE_SECRET_KEY — Stripe secret API key (sk_test_... in test mode)
- STRIPE_WEBHOOK_SECRET — Stripe webhook signing secret (whsec_...)
