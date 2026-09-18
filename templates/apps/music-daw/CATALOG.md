# Music DAW

- **slug**: `music-daw`
- **cluster**: creative-tools
- **type**: full-stack
- **layout**: dashboard

Soundtrap-like digital audio workstation with tracks, instruments, effects, and mixer

> **This is a complete, working app, already built.** The data model, handlers, and screens below all exist on disk (paths shown). Treat this as the user's existing codebase: **adapt the listed files in place** for the request; do not recreate tables, handlers, or pages that already exist, and do not add packages for functionality already implemented here.

## Features

`auth`, `tracks`, `instruments`, `effects`, `mixer`, `export`

## Data model (13 domain tables)

_Already created by the existing SQL in `api/migrations/` — do NOT add new migrations for these tables._

- **music_projects** — id, user_id, name, bpm, time_signature, duration, is_public, created_at, updatedAt
- **audio_tracks** — id, project_id, user_id, name, type, instrument_id, volume, pan, muted, solo, armed, position, …
- **audio_effects** — id, track_id, user_id, type, parameters, enabled, position, created_at, updatedAt
- **audio_exports** — id, project_id, user_id, format, quality, sample_rate, status, output_url, created_at, updatedAt
- **instruments** — id, user_id, name, category, type, settings, created_at, updatedAt
- **samples** — id, user_id, name, url, bpm, music_key, length_sec, waveform_peaks, tags, is_public, created_at, updatedAt
- **clips** — id, track_id, user_id, kind, start_time, duration, source_url, notes, created_at, updatedAt
- **midi_notes** — id, clip_id, user_id, pitch, velocity, start, duration, created_at, updatedAt
- **collaborators** — id, project_id, user_id, collaborator_user_id, invitee_email, role, invited_at, joined_at, created_at, updatedAt
- **user_preferences** — user_id, data, created_at, updatedAt
- **devices** — id, createdAt, updatedAt, userId, name, pushPlatform, pushSubscription, hasPushSubscription
- **tags** — id, name, slug, color, description, createdAt, updatedAt
- **resource_tags** — id, tagId, resourceType, resourceId, createdAt

## API surface (handlers)

_These endpoints already exist — open and extend the named file, never recreate it._

- **clips** — `api/src/handlers/clips.ts`
- **collaborators** — `api/src/handlers/collaborators.ts`
- **effects** — `api/src/handlers/effects.ts`
- **exports** — `api/src/handlers/exports.ts`
- **instruments** — `api/src/handlers/instruments.ts`
- **midi_notes** — `api/src/handlers/midi_notes.ts`
- **preferences** — `api/src/handlers/preferences.ts`
- **projects** — `api/src/handlers/projects.ts`
- **samples** — `api/src/handlers/samples.ts`
- **tracks** — `api/src/handlers/tracks.ts`

## Screens (15)

_These pages already exist — edit the named file in place, never create a parallel one._

- **Landing** `/` → `app/src/pages/Landing.tsx`
- **Login** `/login` → `app/src/pages/Login.tsx`
- **Signup** `/signup` → `app/src/pages/Signup.tsx`
- **ForgotPassword** `/forgot-password` → `app/src/pages/ForgotPassword.tsx`
- **ResetPassword** `/reset-password` → `app/src/pages/ResetPassword.tsx`
- **Dashboard** `/dashboard` (auth) → `app/src/pages/Dashboard.tsx`
- **Projects** `/projects` (auth) → `app/src/pages/Projects.tsx`
- **Editor** `/projects/:id` (auth) → `app/src/pages/Editor.tsx`
- **Samples** `/samples` (auth) → `app/src/pages/Samples.tsx`
- **Mixing** `/projects/:id/mix` (auth) → `app/src/pages/Mixing.tsx`
- **Settings** `/settings` (auth) → `app/src/pages/Settings.tsx`
- **PianoRoll** `/projects/:id/clips/:clipId` (auth) → `app/src/pages/PianoRoll.tsx`
- **SampleDetail** `/samples/:id` (auth) → `app/src/pages/SampleDetail.tsx`
- **Profile** `/profile/:handle` (auth) → `app/src/pages/Profile.tsx`
- **Billing** `/settings/billing` (auth) → `app/src/pages/Billing.tsx`

## Subscription tiers

free / pro / team — gated by: maxEffects, maxExports, maxInstruments, maxProjects, maxTracks, advancedFeatures, canExport, retentionDays

## Integrations (13 @molecule/* packages)

- **Database**: `@molecule/api-database-postgresql`
- **Domain resources**: `@molecule/api-resource-user`, `@molecule/api-resource-tag`
- **Frontend / UI**: `@molecule/app-audio-howler`, `@molecule/app-drag-drop`, `@molecule/app-keyboard-shortcuts`, `@molecule/app-command-palette`, `@molecule/app-file-upload`, `@molecule/app-timeline`
- **Realtime**: `@molecule/api-realtime-socketio`, `@molecule/app-realtime-socketio`
- **Search**: `@molecule/api-search-meilisearch`
- **Uploads & media**: `@molecule/api-uploads-s3`

## Required secrets

- DATABASE_URL — PostgreSQL connection string
- S3_BUCKET — S3 bucket for audio storage
