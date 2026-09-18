# Virtual Classroom

- **slug**: `virtual-classroom`
- **cluster**: education
- **type**: full-stack
- **layout**: dashboard

Google Meet-like virtual classroom with video, whiteboard, chat, and breakout rooms

> **This is a complete, working app, already built.** The data model, handlers, and screens below all exist on disk (paths shown). Treat this as the user's existing codebase: **adapt the listed files in place** for the request; do not recreate tables, handlers, or pages that already exist, and do not add packages for functionality already implemented here.

## Features

`auth`, `realtime`, `video`, `whiteboard`, `file-upload`

## Data model (14 domain tables)

_Already created by the existing SQL in `api/migrations/` — do NOT add new migrations for these tables._

- **assignments** — id, course_id, title, description, due_date, points, type, created_at, updated_at
- **breakout_rooms** — id, parent_room_id, name, status, created_at
- **chat_messages** — id, room_id, user_id, content, type, created_at
- **comments** — id, resourceType, resourceId, userId, parentId, body, editedAt, createdAt, updatedAt
- **course_enrollments** — id, course_id, student_id, role, enrolled_at
- **courses** — id, instructor_id, code, title, term, description, is_published, created_at, updated_at
- **devices** — id, createdAt, updatedAt, userId, name, pushPlatform, pushSubscription, hasPushSubscription
- **grades** — id, assignment_id, student_id, course_id, score, max_score, letter_grade, feedback, graded_at
- **notifications** — id, user_id, type, title, body, link, read_at, created_at
- **recordings** — id, room_id, file_url, duration_seconds, created_at
- **room_participants** — id, room_id, user_id, role, joined_at, left_at
- **rooms** — id, course_id, host_id, name, join_code, status, participant_count, scheduled_at, started_at, ended_at, created_at, updated_at
- **submissions** — id, assignment_id, student_id, content, file_url, status, submitted_at
- **whiteboards** — id, room_id, strokes, created_at, updated_at

## API surface (handlers)

_These endpoints already exist — open and extend the named file, never recreate it._

- **assignments** — `api/src/handlers/assignments.ts`
- **chat** — `api/src/handlers/chat.ts`
- **courses** — `api/src/handlers/courses.ts`
- **grades** — `api/src/handlers/grades.ts`
- **me** — `api/src/handlers/me.ts`
- **notifications** — `api/src/handlers/notifications.ts`
- **recordings** — `api/src/handlers/recordings.ts`
- **rooms** — `api/src/handlers/rooms.ts`
- **whiteboard** — `api/src/handlers/whiteboard.ts`

## Screens (17)

_These pages already exist — edit the named file in place, never create a parallel one._

- **Landing** `/` → `app/src/pages/Landing.tsx`
- **Login** `/login` → `app/src/pages/Login.tsx`
- **Signup** `/signup` → `app/src/pages/Signup.tsx`
- **ForgotPassword** `/forgot-password` → `app/src/pages/ForgotPassword.tsx`
- **ResetPassword** `/reset-password` → `app/src/pages/ResetPassword.tsx`
- **Dashboard** `/dashboard` (auth) → `app/src/pages/Dashboard.tsx`
- **Classroom** `/class/:id` (auth) → `app/src/pages/Classroom.tsx`
- **Assignments** `/assignments` (auth) → `app/src/pages/Assignments.tsx`
- **Courses** `/courses` (auth) → `app/src/pages/Courses.tsx`
- **Whiteboard** `/whiteboard/:id` (auth) → `app/src/pages/Whiteboard.tsx`
- **Settings** `/settings` (auth) → `app/src/pages/Settings.tsx`
- **CourseDetail** `/courses/:id` (auth) → `app/src/pages/CourseDetail.tsx`
- **AssignmentDetail** `/assignments/:id` (auth) → `app/src/pages/AssignmentDetail.tsx`
- **Calendar** `/calendar` (auth) → `app/src/pages/Calendar.tsx`
- **Profile** `/profile/:id` (auth) → `app/src/pages/Profile.tsx`
- **Notifications** `/notifications` (auth) → `app/src/pages/Notifications.tsx`
- **Grades** `/grades` (auth) → `app/src/pages/Grades.tsx`

## Subscription tiers

free / pro / team — gated by: maxChat, maxRecordings, maxRooms, maxWhiteboard, advancedFeatures, canExport, retentionDays

## Integrations (12 @molecule/* packages)

- **Auth & permissions**: `@molecule/api-permissions-custom`
- **Database**: `@molecule/api-database-postgresql`
- **Domain resources**: `@molecule/api-resource-user`, `@molecule/api-resource-comment`
- **Frontend / UI**: `@molecule/app-file-upload`, `@molecule/app-data-table`, `@molecule/app-command-palette`
- **Other API**: `@molecule/api-cron-node-cron`, `@molecule/api-reporting-database`
- **Realtime**: `@molecule/api-realtime-socketio`, `@molecule/app-realtime-socketio`
- **Uploads & media**: `@molecule/api-uploads-s3`

## Required secrets

- DATABASE_URL — PostgreSQL connection string
- S3_BUCKET — S3 bucket for shared files
