# Survey / Feedback Tool

- **slug**: `survey-feedback-tool`
- **cluster**: business-saas
- **type**: full-stack
- **layout**: dashboard

Typeform-like survey builder with form creation, responses, and analytics

> **This is a complete, working app, already built.** The data model, handlers, and screens below all exist on disk (paths shown). Treat this as the user's existing codebase: **adapt the listed files in place** for the request; do not recreate tables, handlers, or pages that already exist, and do not add packages for functionality already implemented here.

## Features

`auth`, `search`, `form-builder`, `responses`, `analytics`, `export`

## Data model (8 domain tables)

_Already created by the existing SQL in `api/migrations/` — do NOT add new migrations for these tables._

- **devices** — id, createdAt, updatedAt, userId, name, pushPlatform, pushSubscription, hasPushSubscription
- **survey_notifications** — id, user_id, kind, payload, read_at, created_at, updatedAt
- **survey_questions** — id, survey_id, position, type, text, description, options, required, conditional_logic, created_at, updated_at, updatedAt
- **survey_responses** — id, survey_id, respondent_id, respondent_email, answers, status, score, submitted_at, created_at, updatedAt
- **survey_share_links** — id, survey_id, kind, url_token, created_by_user_id, expires_at, max_responses, response_count, created_at, updatedAt
- **survey_templates** — id, owner_id, name, description, kind, questions, is_public, created_at, updated_at, updatedAt
- **surveys** — id, owner_id, title, description, slug, status, settings, response_count, published_at, closed_at, created_at, updated_at, …
- **payments** — id, createdAt, updatedAt, userId, transactionId, productId, platformKey, data, receipt

## API surface (handlers)

_These endpoints already exist — open and extend the named file, never recreate it._

- **notifications** — `api/src/handlers/notifications.ts`
- **questions** — `api/src/handlers/questions.ts`
- **reset-password** — `api/src/handlers/reset-password.ts`
- **responses** — `api/src/handlers/responses.ts`
- **share-links** — `api/src/handlers/share-links.ts`
- **surveys** — `api/src/handlers/surveys.ts`
- **templates** — `api/src/handlers/templates.ts`

## Screens (17)

_These pages already exist — edit the named file in place, never create a parallel one._

- **Landing** `/` → `app/src/pages/Landing.tsx`
- **Login** `/login` → `app/src/pages/Login.tsx`
- **Signup** `/signup` → `app/src/pages/Signup.tsx`
- **ForgotPassword** `/forgot-password` → `app/src/pages/ForgotPassword.tsx`
- **ResetPassword** `/reset-password` → `app/src/pages/ResetPassword.tsx`
- **Surveys** `/surveys` (auth) → `app/src/pages/Surveys.tsx`
- **Builder** `/surveys/:id/build` (auth) → `app/src/pages/Builder.tsx`
- **Responses** `/surveys/:id/responses` (auth) → `app/src/pages/Responses.tsx`
- **SurveyDetail** `/surveys/:id` (auth) → `app/src/pages/SurveyDetail.tsx`
- **ResponseDetail** `/surveys/:id/responses/:responseId` (auth) → `app/src/pages/ResponseDetail.tsx`
- **Analytics** `/surveys/:id/analytics` (auth) → `app/src/pages/Analytics.tsx`
- **Templates** `/templates` (auth) → `app/src/pages/Templates.tsx`
- **PublicSurvey** `/s/:slug` → `app/src/pages/PublicSurvey.tsx`
- **ThankYou** `/s/:slug/thank-you` → `app/src/pages/ThankYou.tsx`
- **Settings** `/settings` (auth) → `app/src/pages/Settings.tsx`
- **Profile** `/profile` (auth) → `app/src/pages/Profile.tsx`
- **Notifications** `/notifications` (auth) → `app/src/pages/Notifications.tsx`

## Subscription tiers

free / pro / team — gated by: maxQuestions, maxResponses, maxSurveys, advancedFeatures, canExport, retentionDays

## Integrations (8 @molecule/* packages)

- **Database**: `@molecule/api-database-postgresql`
- **Domain resources**: `@molecule/api-resource-user`
- **Frontend / UI**: `@molecule/app-data-table`, `@molecule/app-drag-drop`, `@molecule/app-command-palette`
- **Other API**: `@molecule/api-import-export-csv`, `@molecule/api-reporting-database`
- **Search**: `@molecule/api-search-meilisearch`

## Required secrets

- DATABASE_URL — PostgreSQL connection string
- MEILISEARCH_API_KEY — MeiliSearch API key
