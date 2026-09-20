# Bill Split

- **slug**: `bill-split`
- **cluster**: finance
- **type**: full-stack
- **layout**: dashboard

Splitwise-like group expense splitting with shared costs, per-member balances, simplified settle-up suggestions, and activity feed

> **This is a complete, working app, already built.** The data model, handlers, and screens below all exist on disk (paths shown). Treat this as the user's existing codebase: **adapt the listed files in place** for the request; do not recreate tables, handlers, or pages that already exist, and do not add packages for functionality already implemented here.

## Features

`auth`, `groups`, `balances`, `activity`

## Data model (8 domain tables)

_Already created by the existing SQL in `api/migrations/` — do NOT add new migrations for these tables._

- **devices** — id, createdAt, updatedAt, userId, name, pushPlatform, pushSubscription, hasPushSubscription
- **groups** — id, user_id, name, description, currency, created_at, updated_at
- **members** — id, user_id, name, email, is_self, created_at
- **memberships** — id, group_id, member_id, role, joined_at
- **expenses** — id, group_id, payer_member_id, amount_cents, description, category, date, split_method, created_at, updated_at
- **expense_shares** — id, expense_id, member_id, amount_cents
- **settlements** — id, group_id, from_member_id, to_member_id, amount_cents, method, date, note, created_at
- **activities** — id, group_id, kind, payload, created_at

## API surface (handlers)

_These endpoints already exist — open and extend the named file, never recreate it._

- **\_activity** — `api/src/handlers/_activity.ts`
- **\_balances** — `api/src/handlers/_balances.ts`
- **\_seed** — `api/src/handlers/_seed.ts`
- **activities** — `api/src/handlers/activities.ts`
- **dashboard** — `api/src/handlers/dashboard.ts`
- **expenses** — `api/src/handlers/expenses.ts`
- **friends** — `api/src/handlers/friends.ts`
- **groups** — `api/src/handlers/groups.ts`
- **settlements** — `api/src/handlers/settlements.ts`

## Screens (16)

_These pages already exist — edit the named file in place, never create a parallel one._

- **Landing** `/` → `app/src/pages/Landing.tsx`
- **Login** `/login` → `app/src/pages/Login.tsx`
- **Signup** `/signup` → `app/src/pages/Signup.tsx`
- **ForgotPassword** `/forgot-password` → `app/src/pages/ForgotPassword.tsx`
- **ResetPassword** `/reset-password` → `app/src/pages/ResetPassword.tsx`
- **Dashboard** `/dashboard` (auth) → `app/src/pages/Dashboard.tsx`
- **Groups** `/groups` (auth) → `app/src/pages/Groups.tsx`
- **GroupDetail** `/groups/:id` (auth) → `app/src/pages/GroupDetail.tsx`
- **NewExpense** `/expenses/new` (auth) → `app/src/pages/NewExpense.tsx`
- **Balances** `/balances` (auth) → `app/src/pages/Balances.tsx`
- **Activity** `/activity` (auth) → `app/src/pages/Activity.tsx`
- **Friends** `/friends` (auth) → `app/src/pages/Friends.tsx`
- **Settings** `/settings` (auth) → `app/src/pages/Settings.tsx`
- **About** `/about` → `app/src/pages/About.tsx`
- **Privacy** `/privacy` → `app/src/pages/Privacy.tsx`
- **Terms** `/terms` → `app/src/pages/Terms.tsx`

## Integrations (4 @molecule/* packages)

- **Auth & permissions**: `@molecule/api-permissions-custom`
- **Database**: `@molecule/api-database-postgresql`
- **Domain resources**: `@molecule/api-resource-user`
- **Email**: `@molecule/api-emails-mailgun`

## Required secrets

- DATABASE_URL — PostgreSQL connection string
