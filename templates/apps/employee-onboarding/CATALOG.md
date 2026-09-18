# Employee Onboarding

- **slug**: `employee-onboarding`
- **cluster**: business-saas
- **type**: full-stack
- **layout**: dashboard

Onboarding portal with task checklists, documents, progress tracking, and welcome flows

> **This is a complete, working app, already built.** The data model, handlers, and screens below all exist on disk (paths shown). Treat this as the user's existing codebase: **adapt the listed files in place** for the request; do not recreate tables, handlers, or pages that already exist, and do not add packages for functionality already implemented here.

## Features

`auth`, `checklists`, `documents`, `progress-tracking`, `welcome-flow`

## Data model (12 domain tables)

_Already created by the existing SQL in `api/migrations/` — do NOT add new migrations for these tables._

- **activities** — id, actorId, action, resourceType, resourceId, metadata, createdAt
- **activity_seen_status** — userId, lastSeenActivityId, updatedAt
- **devices** — id, createdAt, updatedAt, userId, name, pushPlatform, pushSubscription, hasPushSubscription
- **notifications** — id, user_id, kind, title, message, payload, read_at, created_at
- **onboarding_documents** — id, user_id, onboarding_id, name, file_url, s3_key, content_type, category, kind, requires_signature, signed, signed_at, …
- **onboarding_tasks** — id, user_id, onboarding_id, title, description, category, assignee_id, due_date, completed_at, completed_by, attachments, position, …
- **onboarding_templates** — id, user_id, name, role_label, default_duration_days, archived_at, created_at, updated_at
- **onboardings** — id, user_id, employee_id, template_id, manager_id, buddy_id, start_date, status, completion_pct, started_at, completed_at, created_at, …
- **team_members** — id, user_id, person_user_id, name, role, department, manager_user_id, bio, slack_handle, photo_url, email, start_date, …
- **timeline_milestones** — id, user_id, onboarding_id, label, target_at, achieved_at, created_at, updated_at
- **training_modules** — id, user_id, title, description, content, video_url, duration_minutes, quiz, archived_at, created_at, updated_at
- **training_progress** — id, user_id, onboarding_id, module_id, started_at, completed_at, quiz_score, created_at, updated_at

## API surface (handlers)

_These endpoints already exist — open and extend the named file, never recreate it._

- **documents** — `api/src/handlers/documents.ts`
- **notifications** — `api/src/handlers/notifications.ts`
- **onboarding-templates** — `api/src/handlers/onboarding-templates.ts`
- **onboardings** — `api/src/handlers/onboardings.ts`
- **profile** — `api/src/handlers/profile.ts`
- **tasks** — `api/src/handlers/tasks.ts`
- **team-members** — `api/src/handlers/team-members.ts`
- **timeline-milestones** — `api/src/handlers/timeline-milestones.ts`
- **training-modules** — `api/src/handlers/training-modules.ts`
- **training-progress** — `api/src/handlers/training-progress.ts`

## Screens (18)

_These pages already exist — edit the named file in place, never create a parallel one._

- **Login** `/login` → `app/src/pages/Login.tsx`
- **Signup** `/signup` → `app/src/pages/Signup.tsx`
- **ForgotPassword** `/forgot-password` → `app/src/pages/ForgotPassword.tsx`
- **ResetPassword** `/reset-password` → `app/src/pages/ResetPassword.tsx`
- **Dashboard** `/dashboard` (auth) → `app/src/pages/Dashboard.tsx`
- **Checklist** `/checklist` (auth) → `app/src/pages/Checklist.tsx`
- **Documents** `/documents` (auth) → `app/src/pages/Documents.tsx`
- **TeamDirectory** `/team` (auth) → `app/src/pages/TeamDirectory.tsx`
- **Timeline** `/timeline` (auth) → `app/src/pages/Timeline.tsx`
- **Settings** `/settings` (auth) → `app/src/pages/Settings.tsx`
- **Landing** `/` → `app/src/pages/Landing.tsx`
- **TaskDetail** `/checklist/:id` (auth) → `app/src/pages/TaskDetail.tsx`
- **DocumentViewer** `/documents/:id` (auth) → `app/src/pages/DocumentViewer.tsx`
- **TeamMemberProfile** `/team/:id` (auth) → `app/src/pages/TeamMemberProfile.tsx`
- **Notifications** `/notifications` (auth) → `app/src/pages/Notifications.tsx`
- **Profile** `/profile` (auth) → `app/src/pages/Profile.tsx`
- **Training** `/training` (auth) → `app/src/pages/Training.tsx`
- **TrainingModule** `/training/:id` (auth) → `app/src/pages/TrainingModule.tsx`

## Subscription tiers

free / pro / team — gated by: maxDocuments, maxOnboardings, maxTasks, advancedFeatures, canExport, retentionDays

## Integrations (9 @molecule/* packages)

- **Auth & permissions**: `@molecule/api-permissions-custom`
- **Database**: `@molecule/api-database-postgresql`
- **Domain resources**: `@molecule/api-resource-user`, `@molecule/api-resource-activity-feed`
- **Email**: `@molecule/api-emails-mailgun`
- **Frontend / UI**: `@molecule/app-data-table`, `@molecule/app-file-upload`, `@molecule/app-drag-drop`
- **Uploads & media**: `@molecule/api-uploads-s3`

## Required secrets

- DATABASE_URL — PostgreSQL connection string
- S3_BUCKET — S3 bucket for documents
- MAILGUN_API_KEY — Mailgun API key
- MAILGUN_DOMAIN — Mailgun sending domain
