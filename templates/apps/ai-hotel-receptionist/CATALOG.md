# AI Hotel Receptionist

- **slug**: `ai-hotel-receptionist`
- **cluster**: real-estate-travel
- **type**: full-stack
- **layout**: landing

Multilingual AI voice receptionist + PMS: the phone agent answers in the caller's own language and books available rooms — plus rooms, rates, reservations, and guest management

> **This is a complete, working app, already built.** The data model, handlers, and screens below all exist on disk (paths shown). Treat this as the user's existing codebase: **adapt the listed files in place** for the request; do not recreate tables, handlers, or pages that already exist, and do not add packages for functionality already implemented here.

## Features

`auth`, `pms`, `ai-voice`, `multilingual`, `call-simulation`

## Data model (11 domain tables)

_Already created by the existing SQL in `api/migrations/` — do NOT add new migrations for these tables._

- **room_types** — id, name, description, occupancy, base_rate_cents, amenities, created_at, updated_at
- **rooms** — id, number, floor, room_type_id, status, notes, created_at, updated_at
- **rate_plans** — id, name, room_type_id, weekday_adjustment_percent, weekend_adjustment_percent, seasonal_override_cents, seasonal_start, seasonal_end, active, created_at, updated_at
- **guests** — id, name, email, phone, preferred_language, notes, stay_count, created_at, updated_at
- **reservations** — id, guest_id, guest_name, guest_contact, room_type_id, room_id, check_in, check_out, guests, nights, total_cents, status, …
- **voice_agents** — id, name, phone_number, languages, voice_by_language, upsell_enabled, max_discount_percent, transfer_to_human_on, after_hours_message, active, created_at, updated_at
- **calls** — id, voice_agent_id, user_id, direction, detected_language, started_at, ended_at, duration_seconds, outcome, summary, recording_url, mode, …
- **call_messages** — id, call_id, role, text, language, created_at
- **call_actions** — id, call_id, tool, arguments, result, created_at
- **devices** — id, createdAt, updatedAt, userId, name, pushPlatform, pushSubscription, hasPushSubscription
- **payments** — id, createdAt, updatedAt, userId, transactionId, productId, platformKey, data, receipt

## API surface (handlers)

_These endpoints already exist — open and extend the named file, never recreate it._

- **\_seed** — `api/src/handlers/_seed.ts`
- **availability** — `api/src/handlers/availability.ts`
- **calls** — `api/src/handlers/calls.ts`
- **dashboard** — `api/src/handlers/dashboard.ts`
- **guests** — `api/src/handlers/guests.ts`
- **rate-plans** — `api/src/handlers/rate-plans.ts`
- **reservations** — `api/src/handlers/reservations.ts`
- **room-types** — `api/src/handlers/room-types.ts`
- **rooms** — `api/src/handlers/rooms.ts`
- **speech** — `api/src/handlers/speech.ts`
- **voice** — `api/src/handlers/voice.ts`
- **voice-agents** — `api/src/handlers/voice-agents.ts`

## Screens (17)

_These pages already exist — edit the named file in place, never create a parallel one._

- **Landing** `/` → `app/src/pages/Landing.tsx`
- **Login** `/login` → `app/src/pages/Login.tsx`
- **Signup** `/signup` → `app/src/pages/Signup.tsx`
- **ForgotPassword** `/forgot-password` → `app/src/pages/ForgotPassword.tsx`
- **ResetPassword** `/reset-password` → `app/src/pages/ResetPassword.tsx`
- **Dashboard** `/dashboard` (auth) → `app/src/pages/Dashboard.tsx`
- **Reservations** `/reservations` (auth) → `app/src/pages/Reservations.tsx`
- **ReservationDetail** `/reservations/:id` (auth) → `app/src/pages/ReservationDetail.tsx`
- **NewReservation** `/reservations/new` (auth) → `app/src/pages/NewReservation.tsx`
- **RoomsRates** `/rooms` (auth) → `app/src/pages/RoomsRates.tsx`
- **Guests** `/guests` (auth) → `app/src/pages/Guests.tsx`
- **GuestDetail** `/guests/:id` (auth) → `app/src/pages/GuestDetail.tsx`
- **VoiceAgents** `/voice-agents` (auth) → `app/src/pages/VoiceAgents.tsx`
- **Calls** `/calls` (auth) → `app/src/pages/Calls.tsx`
- **CallDetail** `/calls/:id` (auth) → `app/src/pages/CallDetail.tsx`
- **CallSimulator** `/simulator` (auth) → `app/src/pages/CallSimulator.tsx`
- **Account** `/account` (auth) → `app/src/pages/Account.tsx`

## Integrations (8 @molecule/* packages)

- **AI**: `@molecule/api-ai-agents`, `@molecule/api-ai-agents-llm`, `@molecule/api-ai-anthropic`, `@molecule/api-ai-speech-openai`
- **Database**: `@molecule/api-database-postgresql`
- **Domain resources**: `@molecule/api-resource-user`
- **Frontend / UI**: `@molecule/app-sidebar-layout-react`, `@molecule/app-status-timeline-react`

## Required secrets

- DATABASE_URL — PostgreSQL connection string
