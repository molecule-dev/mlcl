# Meal Planner

- **slug**: `meal-planner`
- **cluster**: food-home
- **type**: full-stack
- **layout**: dashboard

Paprika/Mealime-like recipe manager with weekly meal planning, auto-generated grocery lists, and pantry tracking — with built-in Stripe-backed subscription tiers

> **This is a complete, working app, already built.** The data model, handlers, and screens below all exist on disk (paths shown). Treat this as the user's existing codebase: **adapt the listed files in place** for the request; do not recreate tables, handlers, or pages that already exist, and do not add packages for functionality already implemented here.

## Features

`auth`, `search`, `subscriptions`

## Data model (8 domain tables)

_Already created by the existing SQL in `api/migrations/` — do NOT add new migrations for these tables._

- **devices** — id, createdAt, updatedAt, userId, name, pushPlatform, pushSubscription, hasPushSubscription
- **payments** — id, createdAt, updatedAt, userId, transactionId, productId, platformKey, data, receipt
- **recipes** — id, user_id, title, description, servings, prep_minutes, cook_minutes, tags, image_emoji, created_at, updated_at
- **recipe_ingredients** — id, recipe_id, item_name, quantity, unit, position, created_at
- **recipe_steps** — id, recipe_id, position, text, created_at
- **meal_plan_entries** — id, user_id, week_start, day, meal_slot, recipe_id, servings, created_at, updated_at
- **grocery_items** — id, user_id, week_start, name, quantity, unit, category, source, checked, created_at, updated_at
- **pantry_items** — id, user_id, name, quantity, unit, created_at, updated_at

## API surface (handlers)

_These endpoints already exist — open and extend the named file, never recreate it._

- **\_seed** — `api/src/handlers/_seed.ts`
- **grocery-list** — `api/src/handlers/grocery-list.ts`
- **meal-plan** — `api/src/handlers/meal-plan.ts`
- **pantry** — `api/src/handlers/pantry.ts`
- **recipes** — `api/src/handlers/recipes.ts`

## Screens (14)

_These pages already exist — edit the named file in place, never create a parallel one._

- **Landing** `/` → `app/src/pages/Landing.tsx`
- **Login** `/login` → `app/src/pages/Login.tsx`
- **Signup** `/signup` → `app/src/pages/Signup.tsx`
- **ForgotPassword** `/forgot-password` → `app/src/pages/ForgotPassword.tsx`
- **ResetPassword** `/reset-password` → `app/src/pages/ResetPassword.tsx`
- **MealPlan** `/plan` (auth) → `app/src/pages/MealPlan.tsx`
- **Recipes** `/recipes` (auth) → `app/src/pages/Recipes.tsx`
- **RecipeDetail** `/recipes/:id` (auth) → `app/src/pages/RecipeDetail.tsx`
- **RecipeEdit** `/recipes/new` (auth) → `app/src/pages/RecipeEdit.tsx`
- **RecipeEditExisting** `/recipes/:id/edit` (auth) → `app/src/pages/RecipeEdit.tsx`
- **GroceryList** `/groceries` (auth) → `app/src/pages/GroceryList.tsx`
- **Pantry** `/pantry` (auth) → `app/src/pages/Pantry.tsx`
- **Settings** `/settings` (auth) → `app/src/pages/Settings.tsx`
- **Onboarding** `/onboarding` (auth) → `app/src/pages/Onboarding.tsx`

## Integrations (9 @molecule/* packages)

- **Database**: `@molecule/api-database-postgresql`
- **Domain resources**: `@molecule/api-resource-user`, `@molecule/api-resource-payment`
- **Email**: `@molecule/api-email-templates`, `@molecule/api-emails-mailgun`
- **Other API**: `@molecule/api-import-export-csv`
- **Payments & billing**: `@molecule/api-payments-stripe`, `@molecule/api-entitlements`, `@molecule/app-billing-react`

## Required secrets

- DATABASE_URL — PostgreSQL connection string
- STRIPE_SECRET_KEY — Stripe secret API key (sk_test_... in test mode)
- STRIPE_WEBHOOK_SECRET — Stripe webhook signing secret (whsec_...)
