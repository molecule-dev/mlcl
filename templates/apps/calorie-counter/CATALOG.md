# Calorie Counter

- **slug**: `calorie-counter`
- **cluster**: health-fitness
- **type**: full-stack
- **layout**: dashboard

MyFitnessPal-like calorie tracker with food database, barcode scanning, macros, and daily nutrition goals

> **This is a complete, working app, already built.** The data model, handlers, and screens below all exist on disk (paths shown). Treat this as the user's existing codebase: **adapt the listed files in place** for the request; do not recreate tables, handlers, or pages that already exist, and do not add packages for functionality already implemented here.

## Features

`auth`, `search`, `notifications`, `charts`, `date-range`

## Data model (9 domain tables)

_Already created by the existing SQL in `api/migrations/` — do NOT add new migrations for these tables._

- **devices** — id, createdAt, updatedAt, userId, name, pushPlatform, pushSubscription, hasPushSubscription
- **diary_entries** — id, user_id, date, meal_type, food_id, food_name, servings, serving_unit, calories, protein, carbs, fat, …
- **foods** — id, user_id, name, brand, category, barcode, calories, protein, carbs, fat, fiber, sodium, …
- **nutrition_goals** — id, user_id, calories, protein, carbs, fat, fiber, sodium, sugar, is_active, created_at, updated_at
- **payments** — id, createdAt, updatedAt, userId, transactionId, productId, platformKey, data, receipt
- **saved_meal_items** — id, meal_id, food_id, servings, serving_unit, sort_order, created_at
- **saved_meals** — id, user_id, name, total_calories, total_protein, total_carbs, total_fat, created_at, updated_at
- **weight_logs** — id, user_id, weight_kg, recorded_at, notes, created_at, updated_at
- **notification_preferences** — id, user_id, meals, water, streak, weekly, created_at, updated_at

## API surface (handlers)

_These endpoints already exist — open and extend the named file, never recreate it._

- **diary** — `api/src/handlers/diary.ts`
- **foods** — `api/src/handlers/foods.ts`
- **goals** — `api/src/handlers/goals.ts`
- **meals** — `api/src/handlers/meals.ts`
- **notification-preferences** — `api/src/handlers/notification-preferences.ts`
- **nutrition** — `api/src/handlers/nutrition.ts`
- **weight** — `api/src/handlers/weight.ts`

## Screens (15)

_These pages already exist — edit the named file in place, never create a parallel one._

- **Landing** `/` → `app/src/pages/Landing.tsx`
- **Login** `/login` → `app/src/pages/Login.tsx`
- **Signup** `/signup` → `app/src/pages/Signup.tsx`
- **ForgotPassword** `/forgot-password` → `app/src/pages/ForgotPassword.tsx`
- **ResetPassword** `/reset-password` → `app/src/pages/ResetPassword.tsx`
- **Today** `/today` (auth) → `app/src/pages/Today.tsx`
- **LogFood** `/log` (auth) → `app/src/pages/LogFood.tsx`
- **FoodDetail** `/food/:id` (auth) → `app/src/pages/FoodDetail.tsx`
- **Progress** `/progress` (auth) → `app/src/pages/Progress.tsx`
- **Goals** `/goals` (auth) → `app/src/pages/Goals.tsx`
- **Settings** `/settings` (auth) → `app/src/pages/Settings.tsx`
- **Recipes** `/recipes` (auth) → `app/src/pages/Recipes.tsx`
- **RecipeDetail** `/recipes/:id` (auth) → `app/src/pages/RecipeDetail.tsx`
- **WeightTracking** `/weight` (auth) → `app/src/pages/WeightTracking.tsx`
- **Onboarding** `/onboarding` (auth) → `app/src/pages/Onboarding.tsx`

## Subscription tiers

free / pro / team — gated by: maxDiary, maxFoods, maxGoals, maxMeals, maxNutrition, advancedFeatures, canExport, retentionDays

## Integrations (12 @molecule/* packages)

- **Database**: `@molecule/api-database-postgresql`
- **Domain resources**: `@molecule/api-resource-user`
- **Frontend / UI**: `@molecule/app-charts`, `@molecule/app-data-table`, `@molecule/app-date-range-picker`, `@molecule/app-virtual-scroll`, `@molecule/app-command-palette`
- **Notifications**: `@molecule/api-push-notifications-web-push`
- **Other API**: `@molecule/api-reporting-database`, `@molecule/api-cron-node-cron`, `@molecule/api-import-export-csv`
- **Search**: `@molecule/api-search-meilisearch`

## Required secrets

- DATABASE_URL — PostgreSQL connection string
- MEILISEARCH_API_KEY — Meilisearch API key
- VAPID_PUBLIC_KEY — VAPID public key for push notifications
- VAPID_PRIVATE_KEY — VAPID private key for push notifications
