# Photo Sharing

- **slug**: `photo-sharing`
- **cluster**: content-social
- **type**: full-stack
- **layout**: dashboard

Flickr-like photo community with albums, galleries, and EXIF

> **This is a complete, working app, already built.** The data model, handlers, and screens below all exist on disk (paths shown). Treat this as the user's existing codebase: **adapt the listed files in place** for the request; do not recreate tables, handlers, or pages that already exist, and do not add packages for functionality already implemented here.

## Features

`auth`, `albums`, `galleries`, `exif`, `image-upload`, `tags`, `comments`, `favorites`

## Data model (13 domain tables)

_Already created by the existing SQL in `api/migrations/` — do NOT add new migrations for these tables._

- **album_photos** — id, album_id, photo_id, sort_order, created_at
- **albums** — id, owner_id, title, description, cover_photo_id, photo_count, visibility, created_at, updated_at, updatedAt
- **comments** — id, resourceType, resourceId, userId, parentId, body, editedAt, createdAt, updatedAt
- **devices** — id, createdAt, updatedAt, userId, name, pushPlatform, pushSubscription, hasPushSubscription
- **favorites** — id, user_id, photo_id, created_at
- **follows** — id, followerId, targetType, targetId, createdAt, updatedAt
- **galleries** — id, owner_id, title, description, cover_photo_id, visibility, created_at, updated_at, updatedAt
- **gallery_photos** — id, gallery_id, photo_id, sort_order, created_at
- **photos** — id, owner_id, album_id, title, description, caption, original_url, large_url, thumbnail_url, width, height, exif_data, …
- **payments** — id, createdAt, updatedAt, userId, transactionId, productId, platformKey, data, receipt
- **reactions** — id, resourceType, resourceId, userId, type, createdAt, updatedAt
- **resource_tags** — id, tagId, resourceType, resourceId, createdAt
- **tags** — id, name, slug, color, description, createdAt, updatedAt

## API surface (handlers)

_These endpoints already exist — open and extend the named file, never recreate it._

- **albums** — `api/src/handlers/albums.ts`
- **galleries** — `api/src/handlers/galleries.ts`
- **photos** — `api/src/handlers/photos.ts`
- **profiles** — `api/src/handlers/profiles.ts`
- **uploads** — `api/src/handlers/uploads.ts`

## Screens (15)

_These pages already exist — edit the named file in place, never create a parallel one._

- **Landing** `/` → `app/src/pages/Landing.tsx`
- **Login** `/login` → `app/src/pages/Login.tsx`
- **Signup** `/signup` → `app/src/pages/Signup.tsx`
- **ForgotPassword** `/forgot-password` → `app/src/pages/ForgotPassword.tsx`
- **ResetPassword** `/reset-password` → `app/src/pages/ResetPassword.tsx`
- **Explore** `/explore` (auth) → `app/src/pages/Explore.tsx`
- **PhotoDetail** `/photos/:id` (auth) → `app/src/pages/PhotoDetail.tsx`
- **Albums** `/albums` (auth) → `app/src/pages/Albums.tsx`
- **MyPhotos** `/my-photos` (auth) → `app/src/pages/MyPhotos.tsx`
- **Upload** `/upload` (auth) → `app/src/pages/Upload.tsx`
- **Favorites** `/favorites` (auth) → `app/src/pages/Favorites.tsx`
- **Settings** `/settings` (auth) → `app/src/pages/Settings.tsx`
- **AlbumDetail** `/albums/:id` (auth) → `app/src/pages/AlbumDetail.tsx`
- **Profile** `/u/:handle` (auth) → `app/src/pages/Profile.tsx`
- **Galleries** `/galleries` (auth) → `app/src/pages/Galleries.tsx`

## Subscription tiers

free / pro / team — gated by: maxAlbums, maxPhotos, advancedFeatures, canExport, retentionDays

## Integrations (11 @molecule/* packages)

- **Database**: `@molecule/api-database-postgresql`
- **Domain resources**: `@molecule/api-resource-user`, `@molecule/api-resource-comment`, `@molecule/api-resource-reaction`, `@molecule/api-resource-tag`, `@molecule/api-resource-follow`
- **Frontend / UI**: `@molecule/app-gallery-photoswipe`, `@molecule/app-virtual-scroll`
- **Uploads & media**: `@molecule/api-image-sharp`, `@molecule/api-uploads-s3`, `@molecule/app-image-crop`

## Required secrets

- DATABASE_URL — PostgreSQL connection string
- S3_BUCKET — S3 bucket for photo uploads
- S3_ACCESS_KEY_ID — S3 access key
- S3_SECRET_ACCESS_KEY — S3 secret key
