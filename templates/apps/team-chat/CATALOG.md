# Team Chat

- **slug**: `team-chat`
- **cluster**: communication
- **type**: full-stack
- **layout**: chat

Slack-like workspace chat with channels, threads, reactions, file sharing, and integrations

> **This is a complete, working app, already built.** The data model, handlers, and screens below all exist on disk (paths shown). Treat this as the user's existing codebase: **adapt the listed files in place** for the request; do not recreate tables, handlers, or pages that already exist, and do not add packages for functionality already implemented here.

## Features

`auth`, `realtime`, `search`, `notifications`, `file-upload`, `threads`

## Data model (13 domain tables)

_Already created by the existing SQL in `api/migrations/` — do NOT add new migrations for these tables._

- **activities** — id, actorId, action, resourceType, resourceId, metadata, createdAt
- **activity_seen_status** — userId, lastSeenActivityId, updatedAt
- **channel_members** — id, channel_id, user_id, role, joined_at, updated_at, updatedAt
- **channels** — id, created_by, workspace_id, name, description, topic, is_private, is_archived, archived_at, created_at, updated_at, updatedAt
- **devices** — id, createdAt, updatedAt, userId, name, pushPlatform, pushSubscription, hasPushSubscription
- **messages** — id, channel_id, user_id, content, is_edited, edited_at, is_pinned, pinned_at, pinned_by, reply_count, last_reply_at, created_at, …
- **notifications** — id, createdAt, updatedAt
- **reactions** — id, message_id, user_id, emoji, created_at, updatedAt
- **thread_messages** — id, threadId, userId, body, editedAt, createdAt, updatedAt
- **thread_read_status** — threadId, userId, lastReadMessageId, updatedAt
- **thread_replies** — id, parent_message_id, channel_id, user_id, content, is_edited, edited_at, created_at, updatedAt
- **threads** — id, title, creatorId, resourceType, resourceId, closed, createdAt, updatedAt
- **payments** — id, createdAt, updatedAt, userId, transactionId, productId, platformKey, data, receipt

## API surface (handlers)

_These endpoints already exist — open and extend the named file, never recreate it._

- **channels** — `api/src/handlers/channels.ts`
- **members** — `api/src/handlers/members.ts`
- **messages** — `api/src/handlers/messages.ts`
- **reactions** — `api/src/handlers/reactions.ts`
- **threads** — `api/src/handlers/threads.ts`

## Screens (8)

_These pages already exist — edit the named file in place, never create a parallel one._

- **Dashboard** `/` (auth) → `app/src/pages/Dashboard.tsx`
- **Channel** `/channels/:channelId` (auth) → `app/src/pages/Channel.tsx`
- **Thread** `/channels/:channelId/threads/:messageId` (auth) → `app/src/pages/Thread.tsx`
- **Login** `/login` → `app/src/pages/Login.tsx`
- **Signup** `/signup` → `app/src/pages/Signup.tsx`
- **ForgotPassword** `/forgot-password` → `app/src/pages/ForgotPassword.tsx`
- **ResetPassword** `/reset-password` → `app/src/pages/ResetPassword.tsx`
- **Settings** `/settings` (auth) → `app/src/pages/Settings.tsx`

## Subscription tiers

free / pro / team — gated by: maxChannels, maxMembers, maxMessagesPerDay, retentionDays, fileUploadMb, customEmoji, threadsEnabled, voiceVideoCalls, externalIntegrations

## Integrations (18 @molecule/* packages)

- **Auth & permissions**: `@molecule/api-permissions-custom`
- **Database**: `@molecule/api-database-postgresql`
- **Domain resources**: `@molecule/api-resource-user`, `@molecule/api-resource-thread`, `@molecule/api-resource-reaction`, `@molecule/api-resource-notification`, `@molecule/api-resource-activity-feed`
- **Email**: `@molecule/api-emails-mailgun`
- **Frontend / UI**: `@molecule/app-virtual-scroll`, `@molecule/app-file-upload`, `@molecule/app-markdown`, `@molecule/app-command-palette`, `@molecule/app-keyboard-shortcuts`
- **Notifications**: `@molecule/api-push-notifications-web-push`
- **Realtime**: `@molecule/api-realtime-socketio`, `@molecule/app-realtime-socketio`
- **Search**: `@molecule/api-search-meilisearch`
- **Uploads & media**: `@molecule/api-uploads-s3`

## Required secrets

- DATABASE_URL — PostgreSQL connection string
- S3_BUCKET — S3 bucket for file uploads
- MAILGUN_API_KEY — Mailgun API key for email notifications
