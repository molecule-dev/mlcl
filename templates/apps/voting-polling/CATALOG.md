# Voting & Polling

- **slug**: `voting-polling`
- **cluster**: operations-iot
- **type**: full-stack
- **layout**: dashboard

Mentimeter-like polls, ballots, live results, and voting analytics

> **This is a complete, working app, already built.** The data model, handlers, and screens below all exist on disk (paths shown). Treat this as the user's existing codebase: **adapt the listed files in place** for the request; do not recreate tables, handlers, or pages that already exist, and do not add packages for functionality already implemented here.

## Features

`auth`, `realtime`, `reporting`, `analytics`

## Data model (11 domain tables)

_Already created by the existing SQL in `api/migrations/` — do NOT add new migrations for these tables._

- **audience_question_votes** — id, question_id, user_id, voter_id, created_at
- **audience_questions** — id, poll_id, user_id, asker_initial, body, status, asked_at, created_at, updatedAt
- **devices** — id, createdAt, updatedAt, userId, name, pushPlatform, pushSubscription, hasPushSubscription
- **notifications** — id, user_id, type, title, body, href, actor, read, created_at, updatedAt
- **polls** — id, user_id, workspace_id, title, description, type, status, options, start_date, end_date, allow_anonymous, max_votes_per_user, …
- **questions** — id, poll_id, position, kind, prompt, options, required, created_at, updatedAt
- **voters** — id, user_id, workspace_id, name, email, organization, role, eligibility_token, created_at, updatedAt
- **votes** — id, user_id, poll_id, voter_id, option_index, selected_options, ranked_choices, open_text, source, ip_hash, created_at, updatedAt
- **workspace_members** — id, workspace_id, user_id, role, invited_at, accepted_at, created_at, updatedAt
- **workspaces** — id, user_id, name, slug, created_at, updatedAt
- **payments** — id, createdAt, updatedAt, userId, transactionId, productId, platformKey, data, receipt

## API surface (handlers)

_These endpoints already exist — open and extend the named file, never recreate it._

- **\_seed** — `api/src/handlers/_seed.ts`
- **audience_questions** — `api/src/handlers/audience_questions.ts`
- **notifications** — `api/src/handlers/notifications.ts`
- **polls** — `api/src/handlers/polls.ts`
- **profile** — `api/src/handlers/profile.ts`
- **results** — `api/src/handlers/results.ts`
- **team** — `api/src/handlers/team.ts`
- **voters** — `api/src/handlers/voters.ts`
- **votes** — `api/src/handlers/votes.ts`

## Screens (18)

_These pages already exist — edit the named file in place, never create a parallel one._

- **Landing** `/` → `app/src/pages/Landing.tsx`
- **Login** `/login` → `app/src/pages/Login.tsx`
- **Signup** `/signup` → `app/src/pages/Signup.tsx`
- **ForgotPassword** `/forgot-password` → `app/src/pages/ForgotPassword.tsx`
- **ResetPassword** `/reset-password` → `app/src/pages/ResetPassword.tsx`
- **Dashboard** `/dashboard` (auth) → `app/src/pages/Dashboard.tsx`
- **CreatePoll** `/polls/new` (auth) → `app/src/pages/CreatePoll.tsx`
- **LiveResults** `/polls/:id/live` (auth) → `app/src/pages/LiveResults.tsx`
- **Ballot** `/vote/:id` (auth) → `app/src/pages/Ballot.tsx`
- **Analytics** `/analytics` (auth) → `app/src/pages/Analytics.tsx`
- **Settings** `/settings` (auth) → `app/src/pages/Settings.tsx`
- **PollDetail** `/polls/:id` (auth) → `app/src/pages/PollDetail.tsx`
- **Voters** `/voters` (auth) → `app/src/pages/Voters.tsx`
- **AudienceQA** `/polls/:id/qa` (auth) → `app/src/pages/AudienceQA.tsx`
- **PresenterMode** `/polls/:id/present` (auth) → `app/src/pages/PresenterMode.tsx`
- **Notifications** `/notifications` (auth) → `app/src/pages/Notifications.tsx`
- **Team** `/team` (auth) → `app/src/pages/Team.tsx`
- **Billing** `/billing` (auth) → `app/src/pages/Billing.tsx`

## Subscription tiers

free / pro / team — gated by: maxPolls, maxResults, maxVotes, advancedFeatures, canExport, retentionDays

## Integrations (8 @molecule/* packages)

- **Database**: `@molecule/api-database-postgresql`
- **Domain resources**: `@molecule/api-resource-user`
- **Frontend / UI**: `@molecule/app-charts`, `@molecule/app-data-table`, `@molecule/app-command-palette`
- **Other API**: `@molecule/api-reporting-database`
- **Realtime**: `@molecule/api-realtime-socketio`, `@molecule/app-realtime-socketio`

## Required secrets

- DATABASE_URL — PostgreSQL connection string
