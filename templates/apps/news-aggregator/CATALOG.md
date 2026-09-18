# News Aggregator

- **slug**: `news-aggregator`
- **cluster**: content-social
- **type**: full-stack
- **layout**: dashboard

Flipboard-like news with RSS parsing, categories, and personalization

> **This is a complete, working app, already built.** The data model, handlers, and screens below all exist on disk (paths shown). Treat this as the user's existing codebase: **adapt the listed files in place** for the request; do not recreate tables, handlers, or pages that already exist, and do not add packages for functionality already implemented here.

## Features

`auth`, `search`, `rss-parsing`, `categories`, `bookmarks`, `ai-summary`, `personalization`

## Data model (10 domain tables)

_Already created by the existing SQL in `api/migrations/` — do NOT add new migrations for these tables._

- **news_categories** — id, name, slug, icon, color, tint, sort_order, created_at, updatedAt
- **sources** — id, user_id, name, slug, description, feed_url, website_url, category_id, icon_url, bias_value, factual_rating, ownership, …
- **articles** — id, source_id, category_id, title, url, excerpt, content, image_url, summary, bias_score, source_count, sentiment, …
- **story_coverage** — id, article_id, source_id, headline, excerpt, url, published_at, created_at, updatedAt
- **user_interests** — id, user_id, category_id, active, created_at, updatedAt
- **source_followers** — id, user_id, source_id, created_at
- **bookmarks** — id, userId, resourceType, resourceId, folder, createdAt, updatedAt
- **devices** — id, createdAt, updatedAt, userId, name, pushPlatform, pushSubscription, hasPushSubscription
- **tags** — id, name, slug, color, description, createdAt, updatedAt
- **resource_tags** — id, tagId, resourceType, resourceId, createdAt

## API surface (handlers)

_These endpoints already exist — open and extend the named file, never recreate it._

- **articles** — `api/src/handlers/articles.ts`
- **bookmarks** — `api/src/handlers/bookmarks.ts`
- **categories** — `api/src/handlers/categories.ts`
- **search** — `api/src/handlers/search.ts`
- **sources** — `api/src/handlers/sources.ts`
- **stories** — `api/src/handlers/stories.ts`
- **topics** — `api/src/handlers/topics.ts`

## Screens (14)

_These pages already exist — edit the named file in place, never create a parallel one._

- **Landing** `/` → `app/src/pages/Landing.tsx`
- **Login** `/login` → `app/src/pages/Login.tsx`
- **Signup** `/signup` → `app/src/pages/Signup.tsx`
- **ForgotPassword** `/forgot-password` → `app/src/pages/ForgotPassword.tsx`
- **ResetPassword** `/reset-password` → `app/src/pages/ResetPassword.tsx`
- **Home** `/home` (auth) → `app/src/pages/Home.tsx`
- **TopicDetail** `/topics/:slug` (auth) → `app/src/pages/TopicDetail.tsx`
- **StoryDetail** `/stories/:id` (auth) → `app/src/pages/StoryDetail.tsx`
- **Saved** `/saved` (auth) → `app/src/pages/Saved.tsx`
- **Sources** `/sources` (auth) → `app/src/pages/Sources.tsx`
- **Settings** `/settings` (auth) → `app/src/pages/Settings.tsx`
- **Topics** `/topics` (auth) → `app/src/pages/Topics.tsx`
- **SourceDetail** `/sources/:slug` (auth) → `app/src/pages/SourceDetail.tsx`
- **Search** `/search` (auth) → `app/src/pages/Search.tsx`

## Subscription tiers

free / pro / team — gated by: maxArticles, maxBookmarks, maxCategories, maxSources, advancedFeatures, canExport, retentionDays

## Integrations (10 @molecule/* packages)

- **AI**: `@molecule/api-ai-summarization`, `@molecule/api-ai-classification`
- **Database**: `@molecule/api-database-postgresql`
- **Domain resources**: `@molecule/api-resource-user`, `@molecule/api-resource-tag`, `@molecule/api-resource-bookmark`
- **Frontend / UI**: `@molecule/app-virtual-scroll`
- **Other API**: `@molecule/api-sitemap-xml`, `@molecule/api-cron-node-cron`
- **Search**: `@molecule/api-search-meilisearch`

## Required secrets

- DATABASE_URL — PostgreSQL connection string
- MEILISEARCH_API_KEY — MeiliSearch API key
