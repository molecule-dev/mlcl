# Student Portal

- **slug**: `student-portal`
- **cluster**: education
- **type**: full-stack
- **layout**: dashboard

PowerSchool-like student portal with schedule, grades, attendance, and messages

> **This is a complete, working app, already built.** The data model, handlers, and screens below all exist on disk (paths shown). Treat this as the user's existing codebase: **adapt the listed files in place** for the request; do not recreate tables, handlers, or pages that already exist, and do not add packages for functionality already implemented here.

## Features

`auth`, `notifications`, `calendar`

## Data model (12 domain tables)

_Already created by the existing SQL in `api/migrations/` — do NOT add new migrations for these tables._

- **announcements** — id, user_id, school_id, audience, icon, title, body, pinned, created_at, updatedAt
- **assignments** — id, course_id, course_name, user_id, title, description, due_date, points, status, submitted_at, created_at, updatedAt
- **attendance** — id, user_id, course_id, date, weekday, status, classes, note, recorded_at, created_at
- **courses** — id, school_id, term_id, teacher_id, name, subject, room, syllabus, created_at, updatedAt
- **devices** — id, createdAt, updatedAt, userId, name, pushPlatform, pushSubscription, hasPushSubscription
- **grades** — id, user_id, course_id, course_name, subject, term_id, score, letter_grade, weight, graded_at, created_at
- **messages** — id, user_id, recipient_id, recipient_email, thread_id, sender_name, content, read_at, notify_email, created_at
- **notifications** — id, createdAt, updatedAt
- **report_cards** — id, user_id, term_id, generated_at, payload, created_at
- **schedule_entries** — id, user_id, course_id, course_name, subject, teacher, room, period_label, weekday, day, start_time, end_time, …
- **schools** — id, name, domain, created_at, updatedAt
- **terms** — id, school_id, name, start_date, end_date, created_at

## API surface (handlers)

_These endpoints already exist — open and extend the named file, never recreate it._

- **\_seed** — `api/src/handlers/_seed.ts`
- **announcements** — `api/src/handlers/announcements.ts`
- **assignments** — `api/src/handlers/assignments.ts`
- **attendance** — `api/src/handlers/attendance.ts`
- **grades** — `api/src/handlers/grades.ts`
- **messages** — `api/src/handlers/messages.ts`
- **schedule** — `api/src/handlers/schedule.ts`

## Screens (18)

_These pages already exist — edit the named file in place, never create a parallel one._

- **Landing** `/` → `app/src/pages/Landing.tsx`
- **Login** `/login` → `app/src/pages/Login.tsx`
- **Signup** `/signup` → `app/src/pages/Signup.tsx`
- **ForgotPassword** `/forgot-password` → `app/src/pages/ForgotPassword.tsx`
- **ResetPassword** `/reset-password` → `app/src/pages/ResetPassword.tsx`
- **Dashboard** `/dashboard` (auth) → `app/src/pages/Dashboard.tsx`
- **Schedule** `/schedule` (auth) → `app/src/pages/Schedule.tsx`
- **Grades** `/grades` (auth) → `app/src/pages/Grades.tsx`
- **Assignments** `/assignments` (auth) → `app/src/pages/Assignments.tsx`
- **Calendar** `/calendar` (auth) → `app/src/pages/Calendar.tsx`
- **Messages** `/messages` (auth) → `app/src/pages/Messages.tsx`
- **Attendance** `/attendance` (auth) → `app/src/pages/Attendance.tsx`
- **Settings** `/settings` (auth) → `app/src/pages/Settings.tsx`
- **AssignmentDetail** `/assignments/:id` (auth) → `app/src/pages/AssignmentDetail.tsx`
- **CourseDetail** `/courses/:id` (auth) → `app/src/pages/CourseDetail.tsx`
- **MessageThread** `/messages/:id` (auth) → `app/src/pages/MessageThread.tsx`
- **ReportCard** `/grades/report-card` (auth) → `app/src/pages/ReportCard.tsx`
- **Notifications** `/notifications` (auth) → `app/src/pages/Notifications.tsx`

## Subscription tiers

free / pro / team — gated by: maxAnnouncements, maxAttendance, maxGrades, maxMessages, maxSchedule, advancedFeatures, canExport, retentionDays

## Integrations (13 @molecule/* packages)

- **Auth & permissions**: `@molecule/api-permissions-custom`
- **Database**: `@molecule/api-database-postgresql`
- **Domain resources**: `@molecule/api-resource-user`, `@molecule/api-resource-notification`
- **Email**: `@molecule/api-emails-mailgun`
- **Frontend / UI**: `@molecule/app-data-table`, `@molecule/app-calendar`, `@molecule/app-virtual-scroll`, `@molecule/app-command-palette`
- **Notifications**: `@molecule/api-push-notifications-web-push`
- **Other API**: `@molecule/api-cron-node-cron`, `@molecule/api-reporting-database`, `@molecule/api-pdf-pdfkit`

## Required secrets

- DATABASE_URL — PostgreSQL connection string
- MAILGUN_API_KEY — Mailgun API key
