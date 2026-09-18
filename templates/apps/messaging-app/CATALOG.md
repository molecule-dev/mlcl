# Messaging App

- **slug**: `messaging-app`
- **cluster**: communication
- **type**: full-stack
- **layout**: chat

WhatsApp-like 1:1 and group messaging with end-to-end encryption, read receipts, and media sharing

> **This is a complete, working app, already built.** The data model, handlers, and screens below all exist on disk (paths shown). Treat this as the user's existing codebase: **adapt the listed files in place** for the request; do not recreate tables, handlers, or pages that already exist, and do not add packages for functionality already implemented here.

## Features

`auth`, `realtime`, `encryption`, `media`, `notifications`

## Data model (13 domain tables)

_Already created by the existing SQL in `api/migrations/` — do NOT add new migrations for these tables._

- **contacts** — id, user_id, contact_user_id, nickname, is_blocked, created_at, updated_at, updatedAt
- **conversation_participants** — id, conversation_id, user_id, joined_at, last_read_at, is_muted, muted_until, is_archived, unread_count, created_at, updatedAt
- **conversations** — id, type, title, created_by, group_id, last_message_at, last_message_preview, last_sender_id, is_archived, archived_at, created_at, updated_at, …
- **devices** — id, createdAt, updatedAt, userId, name, pushPlatform, pushSubscription, hasPushSubscription
- **group_members** — id, group_id, user_id, role, is_muted, joined_at, updatedAt
- **groups** — id, owner_id, name, description, avatar_url, encryption_enabled, created_at, updated_at, updatedAt
- **media** — id, conversation_id, sender_id, url, thumbnail_url, type, size, name, created_at, updatedAt
- **message_receipts** — id, message_id, user_id, status, at, updatedAt
- **messages** — id, conversation_id, sender_id, content, type, media_id, reply_to_message_id, is_edited, edited_at, deleted_at, created_at, updatedAt
- **payments** — id, createdAt, updatedAt, userId, transactionId, productId, platformKey, data, receipt
- **reactions** — id, message_id, user_id, emoji, created_at, updatedAt
- **notifications** — id, user_id, kind, payload, read_at, created_at, updatedAt
- **user_preferences** — user_id, preferences, updated_at, updatedAt

## API surface (handlers)

_These endpoints already exist — open and extend the named file, never recreate it._

- **\_decorate** — `api/src/handlers/_decorate.ts`
- **\_seed** — `api/src/handlers/_seed.ts`
- **contacts** — `api/src/handlers/contacts.ts`
- **conversations** — `api/src/handlers/conversations.ts`
- **group-members** — `api/src/handlers/group-members.ts`
- **groups** — `api/src/handlers/groups.ts`
- **media** — `api/src/handlers/media.ts`
- **messages** — `api/src/handlers/messages.ts`
- **notifications** — `api/src/handlers/notifications.ts`
- **profile** — `api/src/handlers/profile.ts`
- **reactions** — `api/src/handlers/reactions.ts`
- **search** — `api/src/handlers/search.ts`

## Screens (18)

_These pages already exist — edit the named file in place, never create a parallel one._

- **Landing** `/` → `app/src/pages/Landing.tsx`
- **Login** `/login` → `app/src/pages/Login.tsx`
- **Signup** `/signup` → `app/src/pages/Signup.tsx`
- **ForgotPassword** `/forgot-password` → `app/src/pages/ForgotPassword.tsx`
- **ResetPassword** `/reset-password` → `app/src/pages/ResetPassword.tsx`
- **Inbox** `/inbox` (auth) → `app/src/pages/Inbox.tsx`
- **Conversation** `/conversations/:id` (auth) → `app/src/pages/Conversation.tsx`
- **NewConversation** `/conversations/new` (auth) → `app/src/pages/NewConversation.tsx`
- **Contacts** `/contacts` (auth) → `app/src/pages/Contacts.tsx`
- **Groups** `/groups` (auth) → `app/src/pages/Groups.tsx`
- **Settings** `/settings` (auth) → `app/src/pages/Settings.tsx`
- **ContactDetail** `/contacts/:id` (auth) → `app/src/pages/ContactDetail.tsx`
- **GroupDetail** `/groups/:id` (auth) → `app/src/pages/GroupDetail.tsx`
- **NewGroup** `/groups/new` (auth) → `app/src/pages/NewGroup.tsx`
- **Profile** `/profile` (auth) → `app/src/pages/Profile.tsx`
- **Archive** `/archive` (auth) → `app/src/pages/Archive.tsx`
- **Search** `/search` (auth) → `app/src/pages/Search.tsx`
- **Notifications** `/notifications` (auth) → `app/src/pages/Notifications.tsx`

## Subscription tiers

free / pro / team — gated by: maxContacts, maxConversations, maxMedia, maxMessages, advancedFeatures, canExport, retentionDays

## Integrations (14 @molecule/* packages)

- **Database**: `@molecule/api-database-postgresql`
- **Domain resources**: `@molecule/api-resource-user`, `@molecule/api-resource-thread`, `@molecule/api-resource-reaction`, `@molecule/api-resource-notification`
- **Frontend / UI**: `@molecule/app-virtual-scroll`, `@molecule/app-file-upload`
- **Notifications**: `@molecule/api-push-notifications-web-push`
- **Other API**: `@molecule/api-encryption-aes`
- **Realtime**: `@molecule/api-realtime-socketio`, `@molecule/app-realtime-socketio`
- **Uploads & media**: `@molecule/api-uploads-s3`, `@molecule/api-image-sharp`, `@molecule/app-image-crop`

## Required secrets

- DATABASE_URL — PostgreSQL connection string
- S3_BUCKET — S3 bucket for media uploads
- ENCRYPTION_KEY — AES encryption key for message encryption
