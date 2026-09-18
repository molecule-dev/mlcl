# LMS

- **slug**: `lms`
- **cluster**: education
- **type**: full-stack
- **layout**: dashboard

Canvas-like learning management system with courses, assignments, grades, and discussions

> **This is a complete, working app, already built.** The data model, handlers, and screens below all exist on disk (paths shown). Treat this as the user's existing codebase: **adapt the listed files in place** for the request; do not recreate tables, handlers, or pages that already exist, and do not add packages for functionality already implemented here.

## Features

`auth`, `search`, `notifications`, `file-upload`, `calendar`

## Data model (17 domain tables)

_Already created by the existing SQL in `api/migrations/` — do NOT add new migrations for these tables._

- **activities** — id, actorId, action, resourceType, resourceId, metadata, createdAt
- **activity_seen_status** — userId, lastSeenActivityId, updatedAt
- **assignments** — id, course_id, title, description, due_date, points, type, created_at, updated_at, updatedAt
- **comments** — id, resourceType, resourceId, userId, parentId, body, editedAt, createdAt, updatedAt
- **course_modules** — id, course_id, title, description, position, created_at, updated_at, updatedAt
- **courses** — id, instructor_id, name, description, status, published_at, archived_at, created_at, updated_at, updatedAt
- **devices** — id, createdAt, updatedAt, userId, name, pushPlatform, pushSubscription, hasPushSubscription
- **discussion_replies** — id, discussion_id, author_id, content, created_at, updatedAt
- **discussions** — id, course_id, author_id, title, content, reply_count, created_at, updated_at, updatedAt
- **enrollments** — id, course_id, student_id, student_email, role, status, enrolled_at, updated_at, updatedAt
- **grades** — id, assignment_id, student_id, course_id, score, max_score, letter_grade, feedback, graded_at, updated_at, updatedAt
- **module_items** — id, module_id, title, type, content_id, url, position, created_at, updatedAt
- **lesson_completions** — id, user_id, course_id, lesson_id, completed_at
- **notifications** — id, createdAt, updatedAt
- **resource_tags** — id, tagId, resourceType, resourceId, createdAt
- **submissions** — id, assignment_id, student_id, content, file_url, status, submitted_at, updatedAt
- **tags** — id, name, slug, color, description, createdAt, updatedAt

## API surface (handlers)

_These endpoints already exist — open and extend the named file, never recreate it._

- **\_lmsAccess** — `api/src/handlers/_lmsAccess.ts`
- **assignments** — `api/src/handlers/assignments.ts`
- **courses** — `api/src/handlers/courses.ts`
- **discussions** — `api/src/handlers/discussions.ts`
- **enrollments** — `api/src/handlers/enrollments.ts`
- **grades** — `api/src/handlers/grades.ts`
- **leaderboard** — `api/src/handlers/leaderboard.ts`
- **modules** — `api/src/handlers/modules.ts`
- **stats** — `api/src/handlers/stats.ts`
- **users** — `api/src/handlers/users.ts`

## Screens (11)

_These pages already exist — edit the named file in place, never create a parallel one._

- **Dashboard** `/dashboard` (auth) → `app/src/pages/Dashboard.tsx`
- **CourseDetail** `/course/:courseId` (auth) → `app/src/pages/CourseDetail.tsx`
- **Assignments** `/assignments` (auth) → `app/src/pages/Assignments.tsx`
- **Discussions** `/discussions` (auth) → `app/src/pages/Discussions.tsx`
- **Gradebook** `/gradebook` (auth) → `app/src/pages/Gradebook.tsx`
- **Lesson** `/course/:courseId/lesson/:lessonId` (auth) → `app/src/pages/Lesson.tsx`
- **Login** `/login` → `app/src/pages/Login.tsx`
- **Settings** `/settings` (auth) → `app/src/pages/Settings.tsx`
- **Signup** `/signup` → `app/src/pages/Signup.tsx`
- **ForgotPassword** `/forgot-password` → `app/src/pages/ForgotPassword.tsx`
- **ResetPassword** `/reset-password` → `app/src/pages/ResetPassword.tsx`

## Subscription tiers

free / pro / team — gated by: maxCourses, maxStudents, maxModulesPerCourse, maxAssignments, maxStorageMb, liveClasses, certificates, advancedAnalytics, customBranding, ssoLogin

## Integrations (19 @molecule/* packages)

- **Auth & permissions**: `@molecule/api-permissions-custom`
- **Database**: `@molecule/api-database-postgresql`
- **Domain resources**: `@molecule/api-resource-user`, `@molecule/api-resource-comment`, `@molecule/api-resource-tag`, `@molecule/api-resource-activity-feed`, `@molecule/api-resource-notification`
- **Email**: `@molecule/api-emails-mailgun`
- **Frontend / UI**: `@molecule/app-data-table`, `@molecule/app-file-upload`, `@molecule/app-markdown`, `@molecule/app-calendar`, `@molecule/app-virtual-scroll`, `@molecule/app-command-palette`
- **Notifications**: `@molecule/api-push-notifications-web-push`
- **Other API**: `@molecule/api-cron-node-cron`, `@molecule/api-reporting-database`
- **Search**: `@molecule/api-search-meilisearch`
- **Uploads & media**: `@molecule/api-uploads-s3`

## Required secrets

- DATABASE_URL — PostgreSQL connection string
- S3_BUCKET — S3 bucket for file uploads
- MAILGUN_API_KEY — Mailgun API key for email notifications
