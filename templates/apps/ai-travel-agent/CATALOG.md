# AI Travel Agent

- **slug**: `ai-travel-agent`
- **cluster**: ai-first
- **type**: full-stack
- **layout**: chat

An AI travel agent that books flights by voice, rebooks them when they are delayed, and splits the bill between travelers — with built-in Stripe-backed subscription tiers

> **This is a complete, working app, already built.** The data model, handlers, and screens below all exist on disk (paths shown). Treat this as the user's existing codebase: **adapt the listed files in place** for the request; do not recreate tables, handlers, or pages that already exist, and do not add packages for functionality already implemented here.

## Features

`auth`, `speech-to-text`, `text-to-speech`, `ai-agents`, `flights`, `sms`, `payments`, `subscriptions`

## Data model (9 domain tables)

_Already created by the existing SQL in `api/migrations/` — do NOT add new migrations for these tables._

- **devices** — id, createdAt, updatedAt, userId, name, pushPlatform, pushSubscription, hasPushSubscription
- **payments** — id, createdAt, updatedAt, userId, transactionId, productId, platformKey, data, receipt
- **conversations** — id, user_id, title, message_count, total_seconds_spoken, started_at, ended_at, created_at, updated_at
- **messages** — id, conversation_id, role, content, type, tool_calls, duration_ms, latency_ms, tokens_used, created_at
- **flights** — id, airline, airline_code, flight_number, origin_iata, origin_city, destination_iata, destination_city, depart_date, depart_at, arrive_at, duration_minutes, …
- **trips** — id, user_id, conversation_id, title, origin_iata, destination_iata, depart_date, traveler_count, status, created_at, updated_at
- **bookings** — id, user_id, trip_id, conversation_id, flight_id, source, confirmation_code, status, airline, flight_number, origin_iata, destination_iata, …
- **bill_splits** — id, booking_id, user_id, name, contact, amount_cents, currency, status, pay_token, notified_at, paid_at, card_last4, …
- **notifications** — id, user_id, kind, title, body, link, read_at, created_at

## API surface (handlers)

_These endpoints already exist — open and extend the named file, never recreate it._

- **\_seed** — `api/src/handlers/_seed.ts`
- **bookings** — `api/src/handlers/bookings.ts`
- **conversations** — `api/src/handlers/conversations.ts`
- **flights** — `api/src/handlers/flights.ts`
- **notifications** — `api/src/handlers/notifications.ts`
- **preferences** — `api/src/handlers/preferences.ts`
- **profile** — `api/src/handlers/profile.ts`
- **speech** — `api/src/handlers/speech.ts`
- **splits** — `api/src/handlers/splits.ts`
- **trips** — `api/src/handlers/trips.ts`

## Screens (14)

_These pages already exist — edit the named file in place, never create a parallel one._

- **Landing** `/` → `app/src/pages/Landing.tsx`
- **Login** `/login` → `app/src/pages/Login.tsx`
- **Signup** `/signup` → `app/src/pages/Signup.tsx`
- **ForgotPassword** `/forgot-password` → `app/src/pages/ForgotPassword.tsx`
- **ResetPassword** `/reset-password` → `app/src/pages/ResetPassword.tsx`
- **Pricing** `/pricing` → `app/src/pages/Pricing.tsx`
- **Pay** `/pay/:token` → `app/src/pages/Pay.tsx`
- **Talk** `/talk` (auth) → `app/src/pages/Talk.tsx`
- **Trips** `/trips` (auth) → `app/src/pages/Trips.tsx`
- **TripDetail** `/trips/:id` (auth) → `app/src/pages/TripDetail.tsx`
- **Bills** `/bills` (auth) → `app/src/pages/Bills.tsx`
- **Settings** `/settings` (auth) → `app/src/pages/Settings.tsx`
- **Billing** `/settings/billing` (auth) → `app/src/pages/Billing.tsx`
- **Profile** `/profile` (auth) → `app/src/pages/Profile.tsx`

## Subscription tiers

free / pro / team — gated by: maxBookings, maxConversations, advancedFeatures, canExport, retentionDays

## Integrations (20 @molecule/* packages)

- **AI**: `@molecule/api-ai-anthropic`, `@molecule/api-ai-agents`, `@molecule/api-ai-agents-llm`, `@molecule/api-ai-speech-openai`, `@molecule/api-ai-speech-elevenlabs`, `@molecule/app-ai-voice`
- **Database**: `@molecule/api-database-postgresql`
- **Domain resources**: `@molecule/api-resource-user`, `@molecule/api-resource-payment`
- **Email**: `@molecule/api-email-templates`, `@molecule/api-emails-mailgun`
- **Other API**: `@molecule/api-flights`, `@molecule/api-flights-amadeus`, `@molecule/api-sms`, `@molecule/api-sms-twilio`, `@molecule/api-sms-capture`, `@molecule/api-cron-node-cron`
- **Payments & billing**: `@molecule/api-payments-stripe`, `@molecule/api-entitlements`, `@molecule/app-billing-react`

## Required secrets

- DATABASE_URL — PostgreSQL connection string
- ANTHROPIC_API_KEY — Anthropic API key for the agent
- OPENAI_API_KEY — OpenAI API key for Whisper speech-to-text and text-to-speech
- STRIPE_SECRET_KEY — Stripe secret API key (sk_test_... in test mode)
- STRIPE_WEBHOOK_SECRET — Stripe webhook signing secret (whsec_...)
