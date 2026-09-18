# Applicant Tracking

- **slug**: `applicant-tracking`
- **cluster**: business-saas
- **type**: full-stack
- **layout**: dashboard

Greenhouse-like ATS with job posts, applications, pipeline, and scoring

> **This is a complete, working app, already built.** The data model, handlers, and screens below all exist on disk (paths shown). Treat this as the user's existing codebase: **adapt the listed files in place** for the request; do not recreate tables, handlers, or pages that already exist, and do not add packages for functionality already implemented here.

## Features

`auth`, `search`, `jobs`, `applications`, `pipeline`, `scoring`, `resume-upload`

## Data model (18 domain tables)

_Already created by the existing SQL in `api/migrations/` — do NOT add new migrations for these tables._

- **activities** — id, actorId, action, resourceType, resourceId, metadata, createdAt
- **activity_seen_status** — userId, lastSeenActivityId, updatedAt
- **ai_score_breakdowns** — id, user_id, candidate_id, criterion, score, comment, generated_at, updatedAt
- **applications** — id, user_id, job_id, candidate_id, stage, source, resume_url, cover_letter, days_in_stage, applied_at, updated_at, updatedAt
- **candidate_stage_events** — id, user_id, candidate_id, application_id, from_stage, to_stage, actor_user_id, occurred_at, note, updatedAt
- **candidates** — id, user_id, first_name, last_name, email, phone, location, source, linkedin_url, ai_score, resume_summary, avatar_initial, …
- **comments** — id, resourceType, resourceId, userId, parentId, body, editedAt, createdAt, updatedAt
- **devices** — id, createdAt, updatedAt, userId, name, pushPlatform, pushSubscription, hasPushSubscription
- **interviews** — id, user_id, candidate_id, job_id, scheduled_at, duration_minutes, panel_user_ids, stage, outcome, score, notes, created_at, …
- **jobs** — id, user_id, title, department, location, type, description, requirements, salary_min, salary_max, status, days_open, …
- **notes** — id, user_id, candidate_id, author_user_id, body, created_at, updatedAt
- **notifications** — id, user_id, kind, payload, read_at, created_at, updatedAt
- **offers** — id, user_id, candidate_id, job_id, salary_cents, currency, start_date, status, sent_at, signed_at, created_at, updated_at, …
- **payments** — id, createdAt, updatedAt, userId, transactionId, productId, platformKey, data, receipt
- **resource_tags** — id, tagId, resourceType, resourceId, createdAt
- **resume_uploads** — id, user_id, candidate_id, s3_key, filename, content_type, size_bytes, uploaded_at, updatedAt
- **scorecards** — id, user_id, candidate_id, application_id, interview_id, reviewer_id, criterion, overall_rating, skills_rating, culture_rating, score, comment, …
- **tags** — id, name, slug, color, description, createdAt, updatedAt

## API surface (handlers)

_These endpoints already exist — open and extend the named file, never recreate it._

- **applications** — `api/src/handlers/applications.ts`
- **candidates** — `api/src/handlers/candidates.ts`
- **interviews** — `api/src/handlers/interviews.ts`
- **jobs** — `api/src/handlers/jobs.ts`
- **notifications** — `api/src/handlers/notifications.ts`
- **profile** — `api/src/handlers/profile.ts`
- **reports** — `api/src/handlers/reports.ts`
- **scorecards** — `api/src/handlers/scorecards.ts`
- **settings** — `api/src/handlers/settings.ts`

## Screens (18)

_These pages already exist — edit the named file in place, never create a parallel one._

- **Landing** `/` → `app/src/pages/Landing.tsx`
- **Login** `/login` → `app/src/pages/Login.tsx`
- **Signup** `/signup` → `app/src/pages/Signup.tsx`
- **ForgotPassword** `/forgot-password` → `app/src/pages/ForgotPassword.tsx`
- **ResetPassword** `/reset-password` → `app/src/pages/ResetPassword.tsx`
- **Dashboard** `/dashboard` (auth) → `app/src/pages/Dashboard.tsx`
- **Pipeline** `/pipeline` (auth) → `app/src/pages/Pipeline.tsx`
- **CandidateDetail** `/candidates/:id` (auth) → `app/src/pages/CandidateDetail.tsx`
- **Jobs** `/jobs` (auth) → `app/src/pages/Jobs.tsx`
- **Interviews** `/interviews` (auth) → `app/src/pages/Interviews.tsx`
- **Settings** `/settings` (auth) → `app/src/pages/Settings.tsx`
- **JobDetail** `/jobs/:id` (auth) → `app/src/pages/JobDetail.tsx`
- **NewJob** `/jobs/new` (auth) → `app/src/pages/NewJob.tsx`
- **Candidates** `/candidates` (auth) → `app/src/pages/Candidates.tsx`
- **Reports** `/reports` (auth) → `app/src/pages/Reports.tsx`
- **Notifications** `/notifications` (auth) → `app/src/pages/Notifications.tsx`
- **Profile** `/profile` (auth) → `app/src/pages/Profile.tsx`
- **Billing** `/billing` (auth) → `app/src/pages/Billing.tsx`

## Subscription tiers

free / pro / team — gated by: maxApplications, maxCandidates, maxJobs, maxScorecards, advancedFeatures, canExport, retentionDays

## Integrations (14 @molecule/* packages)

- **AI**: `@molecule/api-ai-classification`
- **Auth & permissions**: `@molecule/api-permissions-custom`
- **Database**: `@molecule/api-database-postgresql`
- **Domain resources**: `@molecule/api-resource-user`, `@molecule/api-resource-tag`, `@molecule/api-resource-comment`, `@molecule/api-resource-activity-feed`
- **Email**: `@molecule/api-emails-mailgun`
- **Frontend / UI**: `@molecule/app-data-table`, `@molecule/app-kanban`, `@molecule/app-file-upload`, `@molecule/app-command-palette`
- **Search**: `@molecule/api-search-meilisearch`
- **Uploads & media**: `@molecule/api-uploads-s3`

## Required secrets

- DATABASE_URL — PostgreSQL connection string
- MEILISEARCH_API_KEY — MeiliSearch API key
- S3_BUCKET — S3 bucket for resumes
- MAILGUN_API_KEY — Mailgun API key
- MAILGUN_DOMAIN — Mailgun sending domain
