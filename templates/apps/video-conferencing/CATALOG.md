# Video Conferencing

- **slug**: `video-conferencing`
- **cluster**: communication
- **type**: full-stack
- **layout**: dashboard

Zoom-like video meetings with WebRTC, screen sharing, recording, and chat

> **This is a complete, working app, already built.** The data model, handlers, and screens below all exist on disk (paths shown). Treat this as the user's existing codebase: **adapt the listed files in place** for the request; do not recreate tables, handlers, or pages that already exist, and do not add packages for functionality already implemented here.

## Features

`auth`, `realtime`, `video`, `screen-share`, `recording`, `calendar`

## Data model (9 domain tables)

_Already created by the existing SQL in `api/migrations/` — do NOT add new migrations for these tables._

- **devices** — id, createdAt, updatedAt, userId, name, pushPlatform, pushSubscription, hasPushSubscription
- **meeting_chat** — id, meeting_id, user_id, guest_name, content, created_at, updatedAt
- **meeting_invites** — id, meeting_id, invitee_email, invitee_user_id, token, sent_at, accepted_at, created_at, updatedAt
- **meeting_participants** — id, meeting_id, user_id, guest_name, role, joined_at, left_at, audio_enabled, video_enabled, screen_sharing, hand_raised, created_at, …
- **meetings** — id, workspace_id, host_id, title, description, status, starts_at, ends_at, is_recurring, recurrence_rule, join_code, password_hash, …
- **notifications** — id, user_id, type, title, body, data, read_at, created_at, createdAt, updatedAt
- **recordings** — id, meeting_id, owner_id, video_url, thumbnail_url, duration_ms, size_bytes, status, created_at, updatedAt
- **workspace_members** — id, workspace_id, user_id, role, joined_at, created_at, updatedAt
- **workspaces** — id, owner_id, name, slug, plan_key, seat_limit, created_at, updated_at, updatedAt

## API surface (handlers)

_These endpoints already exist — open and extend the named file, never recreate it._

- **chat** — `api/src/handlers/chat.ts`
- **invites** — `api/src/handlers/invites.ts`
- **meetings** — `api/src/handlers/meetings.ts`
- **notifications** — `api/src/handlers/notifications.ts`
- **participants** — `api/src/handlers/participants.ts`
- **recordings** — `api/src/handlers/recordings.ts`
- **workspace-members** — `api/src/handlers/workspace-members.ts`
- **workspaces** — `api/src/handlers/workspaces.ts`

## Screens (16)

_These pages already exist — edit the named file in place, never create a parallel one._

- **Landing** `/` → `app/src/pages/Landing.tsx`
- **Login** `/login` → `app/src/pages/Login.tsx`
- **Signup** `/signup` → `app/src/pages/Signup.tsx`
- **ForgotPassword** `/forgot-password` → `app/src/pages/ForgotPassword.tsx`
- **ResetPassword** `/reset-password` → `app/src/pages/ResetPassword.tsx`
- **Dashboard** `/dashboard` (auth) → `app/src/pages/Dashboard.tsx`
- **Schedule** `/schedule` (auth) → `app/src/pages/Schedule.tsx`
- **Lobby** `/meeting/:id/lobby` (auth) → `app/src/pages/Lobby.tsx`
- **Meeting** `/meeting/:id` (auth) → `app/src/pages/Meeting.tsx`
- **Recordings** `/recordings` (auth) → `app/src/pages/Recordings.tsx`
- **Settings** `/settings` (auth) → `app/src/pages/Settings.tsx`
- **MeetingDetail** `/meeting/:id/details` (auth) → `app/src/pages/MeetingDetail.tsx`
- **RecordingDetail** `/recordings/:id` (auth) → `app/src/pages/RecordingDetail.tsx`
- **Notifications** `/notifications` (auth) → `app/src/pages/Notifications.tsx`
- **Billing** `/settings/billing` (auth) → `app/src/pages/Billing.tsx`
- **TeamMembers** `/team` (auth) → `app/src/pages/TeamMembers.tsx`

## Subscription tiers

free / pro / team — gated by: maxChat, maxMeetings, maxParticipants, maxRecordings, advancedFeatures, canExport, retentionDays

## Integrations (10 @molecule/* packages)

- **Database**: `@molecule/api-database-postgresql`
- **Domain resources**: `@molecule/api-resource-user`, `@molecule/api-resource-notification`
- **Email**: `@molecule/api-emails-mailgun`
- **Frontend / UI**: `@molecule/app-calendar`
- **Notifications**: `@molecule/api-push-notifications-web-push`
- **Other API**: `@molecule/api-cron-node-cron`
- **Realtime**: `@molecule/api-realtime-socketio`, `@molecule/app-realtime-socketio`
- **Uploads & media**: `@molecule/api-uploads-s3`

## Required secrets

- DATABASE_URL — PostgreSQL connection string
- S3_BUCKET — S3 bucket for recordings
- MAILGUN_API_KEY — Mailgun API key for meeting invites
- TURN_SERVER_URL — TURN server URL for WebRTC relay
- TURN_SERVER_SECRET — TURN server shared secret
