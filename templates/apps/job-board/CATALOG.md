# Job Board

- **slug**: `job-board`
- **cluster**: operations-iot
- **type**: full-stack
- **layout**: dashboard

Indeed-like job board with postings, applications, employer dashboard, and search

> **This is a complete, working app, already built.** The data model, handlers, and screens below all exist on disk (paths shown). Treat this as the user's existing codebase: **adapt the listed files in place** for the request; do not recreate tables, handlers, or pages that already exist, and do not add packages for functionality already implemented here.

## Features

`auth`, `search`, `uploads`, `email-notifications`

## Data model (11 domain tables)

_Already created by the existing SQL in `api/migrations/` — do NOT add new migrations for these tables._

- **applications** — id, job_id, applicant_id, cover_letter, resume_url, status, created_at, updated_at
- **companies** — id, owner_id, name, logo_url, description, website, employee_count, contact_email, location, status, created_at, updated_at
- **devices** — id, createdAt, updatedAt, userId, name, pushPlatform, pushSubscription, hasPushSubscription
- **job_categories** — id, name, slug, description, created_at, updated_at
- **jobs** — id, company_id, posted_by, title, description, location, salary_min, salary_max, type, status, tags, category_id, …
- **notifications** — id, user_id, kind, body, link, read, created_at
- **resource_tags** — id, tagId, resourceType, resourceId, createdAt
- **saved_jobs** — id, user_id, job_id, saved_at
- **tags** — id, name, slug, color, description, createdAt, updatedAt
- **user_profiles** — user_id, headline, bio, resume_url, skills, location, willing_to_relocate, created_at, updated_at
- **payments** — id, createdAt, updatedAt, userId, transactionId, productId, platformKey, data, receipt

## API surface (handlers)

_These endpoints already exist — open and extend the named file, never recreate it._

- **applications** — `api/src/handlers/applications.ts`
- **categories** — `api/src/handlers/categories.ts`
- **companies** — `api/src/handlers/companies.ts`
- **jobs** — `api/src/handlers/jobs.ts`
- **notifications** — `api/src/handlers/notifications.ts`
- **saved-jobs** — `api/src/handlers/saved-jobs.ts`
- **uploads** — `api/src/handlers/uploads.ts`
- **user-profiles** — `api/src/handlers/user-profiles.ts`

## Screens (16)

_These pages already exist — edit the named file in place, never create a parallel one._

- **Landing** `/` → `app/src/pages/Landing.tsx`
- **Login** `/login` → `app/src/pages/Login.tsx`
- **Signup** `/signup` → `app/src/pages/Signup.tsx`
- **ForgotPassword** `/forgot-password` → `app/src/pages/ForgotPassword.tsx`
- **ResetPassword** `/reset-password` → `app/src/pages/ResetPassword.tsx`
- **Dashboard** `/dashboard` (auth) → `app/src/pages/Dashboard.tsx`
- **Jobs** `/jobs` (auth) → `app/src/pages/Jobs.tsx`
- **JobDetail** `/jobs/:id` (auth) → `app/src/pages/JobDetail.tsx`
- **Applications** `/applications` (auth) → `app/src/pages/Applications.tsx`
- **Companies** `/companies` (auth) → `app/src/pages/Companies.tsx`
- **CompanyDetail** `/companies/:id` (auth) → `app/src/pages/CompanyDetail.tsx`
- **PostJob** `/post-job` (auth) → `app/src/pages/PostJob.tsx`
- **Profile** `/profile` (auth) → `app/src/pages/Profile.tsx`
- **Settings** `/settings` (auth) → `app/src/pages/Settings.tsx`
- **JobApplicants** `/jobs/:id/applicants` (auth) → `app/src/pages/JobApplicants.tsx`
- **Notifications** `/notifications` (auth) → `app/src/pages/Notifications.tsx`

## Subscription tiers

free / pro / team — gated by: maxApplications, maxCategories, maxCompanies, maxJobs, advancedFeatures, canExport, retentionDays

## Integrations (10 @molecule/* packages)

- **Database**: `@molecule/api-database-postgresql`
- **Domain resources**: `@molecule/api-resource-user`, `@molecule/api-resource-tag`
- **Email**: `@molecule/api-emails-mailgun`
- **Frontend / UI**: `@molecule/app-data-table`, `@molecule/app-virtual-scroll`, `@molecule/app-file-upload`, `@molecule/app-command-palette`
- **Search**: `@molecule/api-search-meilisearch`
- **Uploads & media**: `@molecule/api-uploads-s3`

## Required secrets

- DATABASE_URL — PostgreSQL connection string
- MEILISEARCH_API_KEY — MeiliSearch API key
- MAILGUN_API_KEY — Mailgun API key for application notifications
- MAILGUN_DOMAIN — Mailgun sending domain
- AWS_S3_BUCKET — S3 bucket for resume uploads
- AWS_ACCESS_KEY_ID — AWS access key
- AWS_SECRET_ACCESS_KEY — AWS secret key
