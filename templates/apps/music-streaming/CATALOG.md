# Music Streaming

- **slug**: `music-streaming`
- **cluster**: content-social
- **type**: full-stack
- **layout**: dashboard

Spotify-like music with playlists, queue, and artist pages

> **This is a complete, working app, already built.** The data model, handlers, and screens below all exist on disk (paths shown). Treat this as the user's existing codebase: **adapt the listed files in place** for the request; do not recreate tables, handlers, or pages that already exist, and do not add packages for functionality already implemented here.

## Features

`auth`, `search`, `playlists`, `queue`, `audio-player`, `artists`, `albums`, `library`

## Data model (16 domain tables)

_Already created by the existing SQL in `api/migrations/` — do NOT add new migrations for these tables._

- **albums** — id, user_id, artist_id, title, cover_url, release_date, type, created_at, updatedAt
- **artists** — id, user_id, name, slug, bio, avatar_url, monthly_listeners, created_at, updatedAt
- **devices** — id, createdAt, updatedAt, userId, name, pushPlatform, pushSubscription, hasPushSubscription
- **liked_tracks** — id, user_id, track_id, liked_at, updatedAt
- **listening_history** — id, user_id, track_id, ms_played, played_at, listened_at, updatedAt
- **notifications** — id, user_id, kind, payload, read_at, created_at, updatedAt
- **payments** — id, createdAt, updatedAt, userId, transactionId, productId, platformKey, data, receipt
- **playlist_tracks** — id, playlist_id, track_id, position, added_at, updatedAt
- **playlists** — id, user_id, owner_id, name, description, cover_image_url, is_public, track_count, duration_seconds, created_at, updated_at, updatedAt
- **queue_items** — id, user_id, track_id, position, added_at, updatedAt
- **radio_stations** — id, owner_id, user_id, seed_track_id, name, created_at, updatedAt
- **tracks** — id, user_id, album_id, artist_id, title, duration_ms, duration_seconds, track_number, audio_url, genre, play_count, created_at, …
- **artist_follows** — id, user_id, artist_id, followed_at, updatedAt
- **playlist_saves** — id, user_id, playlist_id, saved_at, updatedAt
- **user_playback** — user_id, track_id, position_seconds, is_playing, is_shuffled, repeat_mode, volume, updated_at
- **user_preferences** — user_id, display_name, country, audio_quality, crossfade, gapless, normalize, allow_explicit, public_profile, public_listening, allow_followers, share_listening, …

## API surface (handlers)

_These endpoints already exist — open and extend the named file, never recreate it._

- **\_audio** — `api/src/handlers/_audio.ts`
- **\_decorate** — `api/src/handlers/_decorate.ts`
- **\_seed** — `api/src/handlers/_seed.ts`
- **albums** — `api/src/handlers/albums.ts`
- **artists** — `api/src/handlers/artists.ts`
- **follow** — `api/src/handlers/follow.ts`
- **liked** — `api/src/handlers/liked.ts`
- **notifications** — `api/src/handlers/notifications.ts`
- **playlists** — `api/src/handlers/playlists.ts`
- **preferences** — `api/src/handlers/preferences.ts`
- **queue** — `api/src/handlers/queue.ts`
- **reports** — `api/src/handlers/reports.ts`
- **search** — `api/src/handlers/search.ts`
- **tracks** — `api/src/handlers/tracks.ts`

## Screens (17)

_These pages already exist — edit the named file in place, never create a parallel one._

- **Landing** `/` → `app/src/pages/Landing.tsx`
- **Login** `/login` → `app/src/pages/Login.tsx`
- **Signup** `/signup` → `app/src/pages/Signup.tsx`
- **ForgotPassword** `/forgot-password` → `app/src/pages/ForgotPassword.tsx`
- **ResetPassword** `/reset-password` → `app/src/pages/ResetPassword.tsx`
- **Home** `/home` (auth) → `app/src/pages/Home.tsx`
- **Search** `/search` (auth) → `app/src/pages/Search.tsx`
- **Library** `/library` (auth) → `app/src/pages/Library.tsx`
- **PlaylistDetail** `/playlists/:id` (auth) → `app/src/pages/PlaylistDetail.tsx`
- **ArtistDetail** `/artists/:id` (auth) → `app/src/pages/ArtistDetail.tsx`
- **Radio** `/radio` (auth) → `app/src/pages/Radio.tsx`
- **Settings** `/settings` (auth) → `app/src/pages/Settings.tsx`
- **AlbumDetail** `/albums/:id` (auth) → `app/src/pages/AlbumDetail.tsx`
- **NowPlaying** `/now-playing` (auth) → `app/src/pages/NowPlaying.tsx`
- **Profile** `/profile/:handle` (auth) → `app/src/pages/Profile.tsx`
- **Subscription** `/subscription` (auth) → `app/src/pages/Subscription.tsx`
- **LikedSongs** `/library/liked` (auth) → `app/src/pages/LikedSongs.tsx`

## Subscription tiers

free / pro / team — gated by: maxAlbums, maxArtists, maxPlaylists, maxTracks, advancedFeatures, canExport, retentionDays

## Integrations (9 @molecule/* packages)

- **Database**: `@molecule/api-database-postgresql`
- **Domain resources**: `@molecule/api-resource-user`, `@molecule/api-resource-follow`, `@molecule/api-resource-reaction`
- **Frontend / UI**: `@molecule/app-audio-howler`, `@molecule/app-virtual-scroll`
- **Search**: `@molecule/api-search-meilisearch`
- **Uploads & media**: `@molecule/api-uploads-s3`, `@molecule/api-media-streaming-hls`

## Required secrets

- DATABASE_URL — PostgreSQL connection string
- MEILISEARCH_API_KEY — MeiliSearch API key
- S3_BUCKET — S3 bucket for audio/image uploads
- S3_ACCESS_KEY_ID — S3 access key
- S3_SECRET_ACCESS_KEY — S3 secret key
