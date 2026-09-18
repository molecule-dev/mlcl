# Note-taking

- **slug**: `note-taking`
- **cluster**: productivity
- **type**: full-stack
- **layout**: dashboard

Notion-like note-taking with block editor, nested pages, databases, and templates

> **This is a complete, working app, already built.** The data model, handlers, and screens below all exist on disk (paths shown). Treat this as the user's existing codebase: **adapt the listed files in place** for the request; do not recreate tables, handlers, or pages that already exist, and do not add packages for functionality already implemented here.

## Features

`auth`, `search`, `realtime`, `rich-text`, `nested-pages`, `templates`

## Data model (13 domain tables)

_Already created by the existing SQL in `api/migrations/` — do NOT add new migrations for these tables._

- **activities** — id, actorId, action, resourceType, resourceId, metadata, createdAt
- **activity_seen_status** — userId, lastSeenActivityId, updatedAt
- **blocks** — id, page_id, parent_block_id, type, content, properties, position, created_at, updated_at
- **bookmarks** — id, userId, resourceType, resourceId, folder, createdAt, updatedAt
- **comments** — id, resourceType, resourceId, userId, parentId, body, editedAt, createdAt, updatedAt
- **database_rows** — id, database_id, values, position, created_at, updated_at
- **devices** — id, createdAt, updatedAt, userId, name, pushPlatform, pushSubscription, hasPushSubscription
- **note_databases** — id, workspace_id, page_id, created_by, name, schema, view_type, created_at, updated_at
- **page_templates** — id, workspace_id, created_by, name, description, category, icon, content, is_system, created_at, updated_at
- **pages** — id, workspace_id, parent_id, template_id, created_by, title, icon, cover_image, position, is_favorited, is_template, trashed_at, …
- **resource_tags** — id, tagId, resourceType, resourceId, createdAt
- **tags** — id, name, slug, color, description, createdAt, updatedAt
- **workspaces** — id, owner_id, name, icon, created_at, updated_at

## API surface (handlers)

_These endpoints already exist — open and extend the named file, never recreate it._

- **blocks** — `api/src/handlers/blocks.ts`
- **databases** — `api/src/handlers/databases.ts`
- **pages** — `api/src/handlers/pages.ts`
- **profile** — `api/src/handlers/profile.ts`
- **templates** — `api/src/handlers/templates.ts`
- **workspaces** — `api/src/handlers/workspaces.ts`

## Screens (12)

_These pages already exist — edit the named file in place, never create a parallel one._

- **Landing** `/` → `app/src/pages/Landing.tsx`
- **Login** `/login` → `app/src/pages/Login.tsx`
- **Signup** `/signup` → `app/src/pages/Signup.tsx`
- **ForgotPassword** `/forgot-password` → `app/src/pages/ForgotPassword.tsx`
- **ResetPassword** `/reset-password` → `app/src/pages/ResetPassword.tsx`
- **Home** `/home` (auth) → `app/src/pages/Home.tsx`
- **Notes** `/notes` (auth) → `app/src/pages/Notes.tsx`
- **NoteEditor** `/notes/:id` (auth) → `app/src/pages/NoteEditor.tsx`
- **Search** `/search` (auth) → `app/src/pages/Search.tsx`
- **Graph** `/graph` (auth) → `app/src/pages/Graph.tsx`
- **Tags** `/tags` (auth) → `app/src/pages/Tags.tsx`
- **Settings** `/settings` (auth) → `app/src/pages/Settings.tsx`

## Subscription tiers

free / pro / team — gated by: maxBlocks, maxDatabases, maxPages, maxTemplates, maxWorkspaces, advancedFeatures, canExport, retentionDays

## Integrations (24 @molecule/* packages)

- **AI**: `@molecule/api-ai-summarization`, `@molecule/app-ai-copilot-default`
- **Auth & permissions**: `@molecule/api-permissions-custom`
- **Database**: `@molecule/api-database-postgresql`
- **Domain resources**: `@molecule/api-resource-user`, `@molecule/api-resource-tag`, `@molecule/api-resource-comment`, `@molecule/api-resource-bookmark`, `@molecule/api-resource-activity-feed`
- **Frontend / UI**: `@molecule/app-rich-text-quill`, `@molecule/app-markdown-react-markdown`, `@molecule/app-tree-view-default`, `@molecule/app-drag-drop-dndkit`, `@molecule/app-keyboard-shortcuts-hotkeys`, `@molecule/app-command-palette-cmdk`, `@molecule/app-virtual-scroll-tanstack`, `@molecule/app-file-upload-filepond`
- **Other API**: `@molecule/api-import-export-csv`, `@molecule/api-pdf-pdfkit`
- **Realtime**: `@molecule/api-realtime-socketio`, `@molecule/app-realtime-socketio`
- **Search**: `@molecule/api-search-meilisearch`
- **Uploads & media**: `@molecule/api-uploads-s3`, `@molecule/api-image-sharp`

## Required secrets

- DATABASE_URL — PostgreSQL connection string
- MEILISEARCH_API_KEY — MeiliSearch API key
- S3_BUCKET — S3 bucket for file uploads
