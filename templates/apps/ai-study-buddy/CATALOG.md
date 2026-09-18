# AI Study Buddy

- **slug**: `ai-study-buddy`
- **cluster**: ai-first
- **type**: full-stack
- **layout**: dashboard

Personalized AI tutoring with quiz generation, RAG-powered explanations, and study progress tracking

> **This is a complete, working app, already built.** The data model, handlers, and screens below all exist on disk (paths shown). Treat this as the user's existing codebase: **adapt the listed files in place** for the request; do not recreate tables, handlers, or pages that already exist, and do not add packages for functionality already implemented here.

## Features

`auth`, `ai-tutoring`, `quiz-generation`, `rag-search`, `study-progress`, `streak-tracking`

## Data model (13 domain tables)

_Already created by the existing SQL in `api/migrations/` — do NOT add new migrations for these tables._

- **ai_chat_messages** — id, session_id, user_id, sender, text, citations, created_at
- **devices** — id, createdAt, updatedAt, userId, name, pushPlatform, pushSubscription, hasPushSubscription
- **flashcard_decks** — id, user_id, topic_id, name, description, card_count, last_reviewed_at, created_at, updated_at
- **flashcard_reviews** — id, flashcard_id, user_id, rating, reviewed_at
- **flashcards** — id, deck_id, user_id, front_md, back_md, hint, ease_factor, interval_days, due_at, position, created_at, updated_at
- **notifications** — id, user_id, type, title, body, href, unread, created_at
- **payments** — id, createdAt, updatedAt, userId, transactionId, productId, platformKey, data, receipt
- **quiz_attempts** — id, quiz_id, user_id, score, correct_count, total_count, answers, created_at
- **quiz_questions** — id, quiz_id, position, question, options, correct_index, explanation, created_at
- **quizzes** — id, user_id, topic_id, title, difficulty, question_count, best_score, attempt_count, created_at, updated_at
- **study_materials** — id, topic_id, user_id, title, content, material_type, source_ref, embedding_status, created_at, updated_at
- **study_sessions** — id, user_id, topic_id, session_type, question, answer, cards_reviewed, ai_messages_count, started_at, ended_at, created_at
- **topics** — id, user_id, title, description, subject, color, material_count, mastery_score, last_studied_at, created_at, updated_at

## API surface (handlers)

_These endpoints already exist — open and extend the named file, never recreate it._

- **billing** — `api/src/handlers/billing.ts`
- **dashboard** — `api/src/handlers/dashboard.ts`
- **decks** — `api/src/handlers/decks.ts`
- **notifications** — `api/src/handlers/notifications.ts`
- **profile** — `api/src/handlers/profile.ts`
- **progress** — `api/src/handlers/progress.ts`
- **quizzes** — `api/src/handlers/quizzes.ts`
- **search** — `api/src/handlers/search.ts`
- **topics** — `api/src/handlers/topics.ts`

## Screens (19)

_These pages already exist — edit the named file in place, never create a parallel one._

- **Landing** `/` → `app/src/pages/Landing.tsx`
- **Login** `/login` → `app/src/pages/Login.tsx`
- **Signup** `/signup` → `app/src/pages/Signup.tsx`
- **ForgotPassword** `/forgot-password` → `app/src/pages/ForgotPassword.tsx`
- **ResetPassword** `/reset-password` → `app/src/pages/ResetPassword.tsx`
- **Dashboard** `/dashboard` (auth) → `app/src/pages/Dashboard.tsx`
- **StudySession** `/study/:id` (auth) → `app/src/pages/StudySession.tsx`
- **Flashcards** `/flashcards` (auth) → `app/src/pages/Flashcards.tsx`
- **Quiz** `/quiz/:id` (auth) → `app/src/pages/Quiz.tsx`
- **Courses** `/courses` (auth) → `app/src/pages/Courses.tsx`
- **Settings** `/settings` (auth) → `app/src/pages/Settings.tsx`
- **CourseDetail** `/courses/:id` (auth) → `app/src/pages/CourseDetail.tsx`
- **DeckDetail** `/flashcards/:id` (auth) → `app/src/pages/DeckDetail.tsx`
- **QuizResults** `/quiz/:id/results` (auth) → `app/src/pages/QuizResults.tsx`
- **Progress** `/progress` (auth) → `app/src/pages/Progress.tsx`
- **Profile** `/profile` (auth) → `app/src/pages/Profile.tsx`
- **Notifications** `/notifications` (auth) → `app/src/pages/Notifications.tsx`
- **Billing** `/billing` (auth) → `app/src/pages/Billing.tsx`
- **Search** `/search` (auth) → `app/src/pages/Search.tsx`

## Subscription tiers

free / pro / team — gated by: maxQuizzes, maxTopics, advancedFeatures, canExport, retentionDays

## Integrations (10 @molecule/* packages)

- **AI**: `@molecule/api-ai-anthropic`, `@molecule/api-ai-rag`, `@molecule/api-ai-embeddings-openai`, `@molecule/api-ai-vector-store-pgvector`, `@molecule/api-ai-agents`, `@molecule/app-ai-assistant`
- **Database**: `@molecule/api-database-postgresql`
- **Domain resources**: `@molecule/api-resource-user`
- **Frontend / UI**: `@molecule/app-stepper`, `@molecule/app-markdown`

## Required secrets

- DATABASE_URL — PostgreSQL connection string
- ANTHROPIC_API_KEY — Anthropic API key for Claude tutoring and quiz generation
- OPENAI_API_KEY — OpenAI API key for embeddings and RAG indexing
