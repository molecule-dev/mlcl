# Social Media Feed

- **slug**: `social-media`
- **cluster**: content-social
- **type**: full-stack
- **layout**: dashboard

Instagram-like social with posts, stories, followers, and feed

> **This is a complete, working app, already built.** The data model, handlers, and screens below all exist on disk (paths shown). Treat this as the user's existing codebase: **adapt the listed files in place** for the request; do not recreate tables, handlers, or pages that already exist, and do not add packages for functionality already implemented here.

## Features

`auth`, `feed`, `stories`, `followers`, `likes`, `comments`, `image-upload`, `realtime`, `push-notifications`

## Data model (17 domain tables)

_Already created by the existing SQL in `api/migrations/` — do NOT add new migrations for these tables._

- **activities** — id, actorId, action, resourceType, resourceId, metadata, createdAt
- **activity_seen_status** — userId, lastSeenActivityId, updatedAt
- **bookmarks** — id, userId, resourceType, resourceId, folder, createdAt, updatedAt
- **comments** — id, resourceType, resourceId, userId, parentId, body, editedAt, createdAt, updatedAt
- **devices** — id, createdAt, updatedAt, userId, name, pushPlatform, pushSubscription, hasPushSubscription
- **dm_messages** — id, dm_thread_id, sender_id, content, media_url, seen_at, created_at
- **dm_threads** — id, user_a_id, user_b_id, last_message_at, created_at
- **follows** — id, followerId, targetType, targetId, createdAt, updatedAt
- **moderation_reports** — id, reporter_id, target_type, target_id, reason, status, resolution, resolved_by, resolved_at, created_at
- **notifications** — id, user_id, type, actor_id, target_type, target_id, body, href, unread, created_at
- **post_comments** — id, post_id, user_id, parent_id, body, created_at, updated_at
- **post_likes** — id, post_id, user_id, created_at
- **posts** — id, user_id, caption, media_urls, thumbnail_url, hashtags, location, visibility, like_count, comment_count, created_at, updated_at
- **reactions** — id, resourceType, resourceId, userId, type, createdAt, updatedAt
- **stories** — id, user_id, media_url, caption, view_count, visibility, created_at, expires_at
- **story_views** — id, story_id, viewer_id, viewed_at
- **user_follows** — id, follower_id, following_id, created_at

## API surface (handlers)

_These endpoints already exist — open and extend the named file, never recreate it._

- **\_notify** — `api/src/handlers/_notify.ts`
- **feed** — `api/src/handlers/feed.ts`
- **follows** — `api/src/handlers/follows.ts`
- **messages** — `api/src/handlers/messages.ts`
- **moderation** — `api/src/handlers/moderation.ts`
- **notifications** — `api/src/handlers/notifications.ts`
- **posts** — `api/src/handlers/posts.ts`
- **stories** — `api/src/handlers/stories.ts`
- **users** — `api/src/handlers/users.ts`

## Screens (14)

_These pages already exist — edit the named file in place, never create a parallel one._

- **Landing** `/` → `app/src/pages/Landing.tsx`
- **Login** `/login` → `app/src/pages/Login.tsx`
- **Signup** `/signup` → `app/src/pages/Signup.tsx`
- **ForgotPassword** `/forgot-password` → `app/src/pages/ForgotPassword.tsx`
- **ResetPassword** `/reset-password` → `app/src/pages/ResetPassword.tsx`
- **Feed** `/feed` (auth) → `app/src/pages/Feed.tsx`
- **Profile** `/profile/:handle` (auth) → `app/src/pages/Profile.tsx`
- **PostDetail** `/posts/:id` (auth) → `app/src/pages/PostDetail.tsx`
- **Explore** `/explore` (auth) → `app/src/pages/Explore.tsx`
- **Messages** `/messages` (auth) → `app/src/pages/Messages.tsx`
- **Notifications** `/notifications` (auth) → `app/src/pages/Notifications.tsx`
- **Settings** `/settings` (auth) → `app/src/pages/Settings.tsx`
- **Search** `/search` (auth) → `app/src/pages/Search.tsx`
- **Pricing** `/pricing` → `app/src/pages/Pricing.tsx`

## Subscription tiers

free / pro / team — gated by: maxFollows, maxPosts, maxStories, advancedFeatures, canExport, retentionDays

## Integrations (16 @molecule/* packages)

- **Database**: `@molecule/api-database-postgresql`
- **Domain resources**: `@molecule/api-resource-user`, `@molecule/api-resource-comment`, `@molecule/api-resource-reaction`, `@molecule/api-resource-follow`, `@molecule/api-resource-activity-feed`, `@molecule/api-resource-bookmark`
- **Frontend / UI**: `@molecule/app-virtual-scroll`, `@molecule/app-gallery`
- **Notifications**: `@molecule/api-push-notifications-web-push`
- **Other API**: `@molecule/api-content-moderation`
- **Realtime**: `@molecule/api-realtime-socketio`, `@molecule/app-realtime-socketio`
- **Uploads & media**: `@molecule/api-image-sharp`, `@molecule/api-uploads-s3`, `@molecule/app-image-crop`

## Required secrets

- DATABASE_URL — PostgreSQL connection string
- S3_BUCKET — S3 bucket for media uploads
- S3_ACCESS_KEY_ID — S3 access key
- S3_SECRET_ACCESS_KEY — S3 secret key
- VAPID_PUBLIC_KEY — VAPID public key for push notifications
- VAPID_PRIVATE_KEY — VAPID private key for push notifications
