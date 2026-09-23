# AI Meeting Notes

- **slug**: `ai-meeting-notes`
- **cluster**: ai-first
- **type**: full-stack
- **layout**: dashboard

Meeting transcription, AI summarization, and action item extraction

> **This is a complete, working app, already built.** The data model, handlers, and screens below all exist on disk (paths shown). Treat this as the user's existing codebase: **adapt the listed files in place** for the request; do not recreate tables, handlers, or pages that already exist, and do not add packages for functionality already implemented here.

## Features

`auth`, `transcription`, `summarization`, `action-items`, `timeline`

## Data model (9 domain tables)

_Already created by the existing SQL in `api/migrations/` — do NOT add new migrations for these tables._

- **action_items** — id, meeting_id, user_id, description, assignee_user_id, due_date, priority, status, source_segment_id, created_at, updatedAt
- **api_tokens** — id, user_id, label, hashed_token, last_used_at, created_at, updatedAt
- **calendar_events** — id, user_id, source, external_event_id, title, starts_at, ends_at, attendees_json, conference_url, meeting_id, created_at, updatedAt
- **devices** — id, createdAt, updatedAt, userId, name, pushPlatform, pushSubscription, hasPushSubscription
- **meetings** — id, user_id, team_id, title, source, recorded_at, duration_minutes, audio_s3_key, transcription_status, summary_md, ai_summary_short, primary_speaker_id, …
- **notifications** — id, user_id, kind, title, body, link, read_at, created_at, updatedAt
- **payments** — id, createdAt, updatedAt, userId, transactionId, productId, platformKey, data, receipt
- **team_members** — id, team_id, user_id, invitee_email, role, invited_at, joined_at, created_at, updatedAt
- **transcript_segments** — id, meeting_id, user_id, ts_start_ms, ts_end_ms, speaker_id, text, confidence, created_at, updatedAt

## API surface (handlers)

_These endpoints already exist — open and extend the named file, never recreate it._

- **action_items** — `api/src/handlers/action_items.ts`
- **api_tokens** — `api/src/handlers/api_tokens.ts`
- **calendar_events** — `api/src/handlers/calendar_events.ts`
- **meetings** — `api/src/handlers/meetings.ts`
- **notifications** — `api/src/handlers/notifications.ts`
- **search** — `api/src/handlers/search.ts`
- **settings** — `api/src/handlers/settings.ts`
- **team** — `api/src/handlers/team.ts`
- **transcript_segments** — `api/src/handlers/transcript_segments.ts`

## Screens (17)

_These pages already exist — edit the named file in place, never create a parallel one._

- **Landing** `/` → `app/src/pages/Landing.tsx`
- **Login** `/login` → `app/src/pages/Login.tsx`
- **Signup** `/signup` → `app/src/pages/Signup.tsx`
- **ForgotPassword** `/forgot-password` → `app/src/pages/ForgotPassword.tsx`
- **ResetPassword** `/reset-password` → `app/src/pages/ResetPassword.tsx`
- **Dashboard** `/dashboard` (auth) → `app/src/pages/Dashboard.tsx`
- **MeetingDetail** `/meetings/:id` (auth) → `app/src/pages/MeetingDetail.tsx`
- **Meetings** `/meetings` (auth) → `app/src/pages/Meetings.tsx`
- **Record** `/record` (auth) → `app/src/pages/Record.tsx`
- **ActionItems** `/actions` (auth) → `app/src/pages/ActionItems.tsx`
- **Integrations** `/integrations` (auth) → `app/src/pages/Integrations.tsx`
- **Settings** `/settings` (auth) → `app/src/pages/Settings.tsx`
- **Calendar** `/calendar` (auth) → `app/src/pages/Calendar.tsx`
- **Team** `/team` (auth) → `app/src/pages/Team.tsx`
- **Search** `/search` (auth) → `app/src/pages/Search.tsx`
- **Notifications** `/notifications` (auth) → `app/src/pages/Notifications.tsx`
- **Profile** `/profile` (auth) → `app/src/pages/Profile.tsx`

## Subscription tiers

free / pro / team — gated by: maxActions, maxMeetings, advancedFeatures, canExport, retentionDays

## Integrations (10 @molecule/* packages)

- **AI**: `@molecule/api-ai-anthropic`, `@molecule/api-ai-speech-openai`, `@molecule/api-ai-summarization`, `@molecule/app-ai-assistant`
- **Database**: `@molecule/api-database-postgresql`
- **Domain resources**: `@molecule/api-resource-user`
- **Frontend / UI**: `@molecule/app-timeline`, `@molecule/app-markdown`, `@molecule/app-data-table`
- **Uploads & media**: `@molecule/api-uploads-s3`

## Required secrets

- DATABASE_URL — PostgreSQL connection string
- ANTHROPIC_API_KEY — Anthropic API key for Claude
- OPENAI_API_KEY — OpenAI API key for Whisper transcription
- AWS_ACCESS_KEY_ID — AWS access key for S3 uploads
- AWS_SECRET_ACCESS_KEY — AWS secret key for S3 uploads
- S3_BUCKET — S3 bucket for audio file storage
