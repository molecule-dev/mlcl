# Course Marketplace

- **slug**: `course-marketplace`
- **cluster**: education
- **type**: full-stack
- **layout**: landing

Udemy-like course marketplace with listings, enrollment, video lessons, and certificates

> **This is a complete, working app, already built.** The data model, handlers, and screens below all exist on disk (paths shown). Treat this as the user's existing codebase: **adapt the listed files in place** for the request; do not recreate tables, handlers, or pages that already exist, and do not add packages for functionality already implemented here.

## Features

`auth`, `search`, `payments`, `video`, `file-upload`

## Data model (16 domain tables)

_Already created by the existing SQL in `api/migrations/` — do NOT add new migrations for these tables._

- **bookmarks** — id, userId, resourceType, resourceId, folder, createdAt, updatedAt
- **devices** — id, createdAt, updatedAt, userId, name, pushPlatform, pushSubscription, hasPushSubscription
- **orders** — id, userId, status, subtotal, tax, shipping, discount, total, shippingAddress, billingAddress, paymentId, notes, …
- **order_items** — id, orderId, productId, variantId, name, price, quantity, image
- **order_events** — id, orderId, status, metadata, createdAt
- **payments** — id, createdAt, updatedAt, userId, transactionId, productId, platformKey, data, receipt
- **reviews** — id, resourceType, resourceId, userId, rating, title, body, helpful, createdAt, updatedAt
- **review_helpful** — reviewId, userId, createdAt
- **tags** — id, name, slug, color, description, createdAt, updatedAt
- **resource_tags** — id, tagId, resourceType, resourceId, createdAt
- **courses** — id, instructor_id, user_id, title, slug, description, category, thumbnail_url, price_cents, level, duration_min, total_lessons, …
- **lessons** — id, course_id, user_id, title, description, video_url, video_hls_url, thumbnail_url, duration_sec, sort_order, free_preview, created_at, …
- **enrollments** — id, user_id, course_id, payment_id, progress, completed_at, enrolled_at, created_at, updated_at, updatedAt
- **lesson_progress** — id, user_id, lesson_id, course_id, watched_seconds, completed_at, created_at, updated_at, updatedAt
- **certificates** — id, user_id, course_id, enrollment_id, certificate_number, pdf_url, issued_at, created_at, updatedAt
- **notifications** — id, user_id, type, title, body, href, entity_id, unread, read_at, created_at, updatedAt

## API surface (handlers)

_These endpoints already exist — open and extend the named file, never recreate it._

- **\_decorate** — `api/src/handlers/_decorate.ts`
- **\_seed** — `api/src/handlers/_seed.ts`
- **catalog** — `api/src/handlers/catalog.ts`
- **certificates** — `api/src/handlers/certificates.ts`
- **checkout** — `api/src/handlers/checkout.ts`
- **enrollments** — `api/src/handlers/enrollments.ts`
- **instructors** — `api/src/handlers/instructors.ts`
- **lessons** — `api/src/handlers/lessons.ts`
- **notifications** — `api/src/handlers/notifications.ts`
- **reviews** — `api/src/handlers/reviews.ts`

## Screens (16)

_These pages already exist — edit the named file in place, never create a parallel one._

- **Landing** `/` → `app/src/pages/Landing.tsx`
- **Login** `/login` → `app/src/pages/Login.tsx`
- **Signup** `/signup` → `app/src/pages/Signup.tsx`
- **ForgotPassword** `/forgot-password` → `app/src/pages/ForgotPassword.tsx`
- **ResetPassword** `/reset-password` → `app/src/pages/ResetPassword.tsx`
- **Browse** `/browse` → `app/src/pages/Browse.tsx`
- **CourseDetail** `/courses/:id` → `app/src/pages/CourseDetail.tsx`
- **Lesson** `/courses/:id/lessons/:lessonId` (auth) → `app/src/pages/Lesson.tsx`
- **MyLearning** `/my-learning` (auth) → `app/src/pages/MyLearning.tsx`
- **InstructorDashboard** `/instructor` (auth) → `app/src/pages/InstructorDashboard.tsx`
- **Settings** `/settings` (auth) → `app/src/pages/Settings.tsx`
- **Checkout** `/checkout` (auth) → `app/src/pages/Checkout.tsx`
- **InstructorCourseEditor** `/instructor/courses/:id/edit` (auth) → `app/src/pages/InstructorCourseEditor.tsx`
- **InstructorProfile** `/instructors/:id` → `app/src/pages/InstructorProfile.tsx`
- **Certificate** `/my-learning/:courseId/certificate` (auth) → `app/src/pages/Certificate.tsx`
- **Notifications** `/notifications` (auth) → `app/src/pages/Notifications.tsx`

## Subscription tiers

free / pro / team — gated by: maxCatalog, maxCertificates, maxEnrollments, maxInstructors, maxLessons, maxReviews, advancedFeatures, canExport, retentionDays

## Integrations (18 @molecule/* packages)

- **Database**: `@molecule/api-database-postgresql`
- **Domain resources**: `@molecule/api-resource-user`, `@molecule/api-resource-review`, `@molecule/api-resource-tag`, `@molecule/api-resource-order`, `@molecule/api-resource-bookmark`
- **Email**: `@molecule/api-emails-mailgun`
- **Frontend / UI**: `@molecule/app-data-table`, `@molecule/app-virtual-scroll`, `@molecule/app-file-upload`, `@molecule/app-command-palette`
- **Other API**: `@molecule/api-reporting-database`, `@molecule/api-pdf-pdfkit`
- **Payments & billing**: `@molecule/api-payments-stripe`
- **Search**: `@molecule/api-search-meilisearch`
- **Uploads & media**: `@molecule/api-uploads-s3`, `@molecule/api-media-streaming-hls`, `@molecule/api-image-sharp`

## Required secrets

- DATABASE_URL — PostgreSQL connection string
- STRIPE_SECRET_KEY — Stripe secret key
- STRIPE_PUBLISHABLE_KEY — Stripe publishable key
- S3_BUCKET — S3 bucket for videos and assets
- MAILGUN_API_KEY — Mailgun API key
