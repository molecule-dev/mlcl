# Blog / Publishing Platform

- **slug**: `blog`
- **cluster**: content-social
- **type**: full-stack
- **layout**: dashboard

Medium-like content publishing with rich text, SEO, RSS, drafts, and scheduling

> **This is a complete, working app, already built.** The data model, handlers, and screens below all exist on disk (paths shown). Treat this as the user's existing codebase: **adapt the listed files in place** for the request; do not recreate tables, handlers, or pages that already exist, and do not add packages for functionality already implemented here.

## Features

`auth`, `search`, `rss`, `seo`, `scheduling`, `drafts`, `rich-text`, `image-upload`

## Data model (8 domain tables)

_Already created by the existing SQL in `api/migrations/` — do NOT add new migrations for these tables._

- **bookmarks** — id, userId, resourceType, resourceId, folder, createdAt, updatedAt
- **categories** — id, name, slug, description, created_at, updatedAt
- **comments** — id, resourceType, resourceId, userId, parentId, body, editedAt, createdAt, updatedAt, status
- **devices** — id, createdAt, updatedAt, userId, name, pushPlatform, pushSubscription, hasPushSubscription
- **posts** — id, author_id, user_id, title, slug, content, excerpt, category_id, tags, cover_image_url, status, published_at, …
- **reactions** — id, resourceType, resourceId, userId, type, createdAt, updatedAt
- **resource_tags** — id, tagId, resourceType, resourceId, createdAt
- **tags** — id, name, slug, color, description, createdAt, updatedAt

## API surface (handlers)

_These endpoints already exist — open and extend the named file, never recreate it._

- **\_scheduled** — `api/src/handlers/_scheduled.ts`
- **analytics** — `api/src/handlers/analytics.ts`
- **categories** — `api/src/handlers/categories.ts`
- **comments** — `api/src/handlers/comments.ts`
- **feed** — `api/src/handlers/feed.ts`
- **interactions** — `api/src/handlers/interactions.ts`
- **notifications** — `api/src/handlers/notifications.ts`
- **posts** — `api/src/handlers/posts.ts`
- **profile** — `api/src/handlers/profile.ts`
- **tags** — `api/src/handlers/tags.ts`

## Screens (13)

_These pages already exist — edit the named file in place, never create a parallel one._

- **Analytics** `/analytics` (auth) → `app/src/pages/Analytics.tsx`
- **Comments** `/comments` (auth) → `app/src/pages/Comments.tsx`
- **Dashboard** `/dashboard` (auth) → `app/src/pages/Dashboard.tsx`
- **ForgotPassword** `/forgot-password` → `app/src/pages/ForgotPassword.tsx`
- **Landing** `/` → `app/src/pages/Landing.tsx`
- **Login** `/login` → `app/src/pages/Login.tsx`
- **PostDetail** `/post/:id` → `app/src/pages/PostDetail.tsx`
- **PostEditor** `/posts/new` (auth) → `app/src/pages/PostEditor.tsx`
- **PostList** `/posts` (auth) → `app/src/pages/PostList.tsx`
- **ResetPassword** `/reset-password` → `app/src/pages/ResetPassword.tsx`
- **Settings** `/settings` (auth) → `app/src/pages/Settings.tsx`
- **Signup** `/signup` → `app/src/pages/Signup.tsx`
- **Tags** `/tags` (auth) → `app/src/pages/Tags.tsx`

## Subscription tiers

free / pro / team — gated by: maxPosts, maxCommentsPerDay, canSchedulePosts, canUploadImages, uploadStorageMb, aiSummarization, advancedAnalytics, maxTags, canExport

## Integrations (15 @molecule/* packages)

- **AI**: `@molecule/api-ai-summarization`, `@molecule/app-ai-copilot`
- **Database**: `@molecule/api-database-postgresql`
- **Domain resources**: `@molecule/api-resource-user`, `@molecule/api-resource-comment`, `@molecule/api-resource-reaction`, `@molecule/api-resource-tag`, `@molecule/api-resource-bookmark`
- **Frontend / UI**: `@molecule/app-markdown`, `@molecule/app-virtual-scroll`, `@molecule/app-data-table`
- **Other API**: `@molecule/api-sitemap-xml`
- **Search**: `@molecule/api-search-meilisearch`
- **Uploads & media**: `@molecule/api-image-sharp`, `@molecule/api-uploads-s3`

## Required secrets

- DATABASE_URL — PostgreSQL connection string
- MEILISEARCH_API_KEY — MeiliSearch API key
- S3_BUCKET — S3 bucket for image uploads
- S3_ACCESS_KEY_ID — S3 access key
- S3_SECRET_ACCESS_KEY — S3 secret key
