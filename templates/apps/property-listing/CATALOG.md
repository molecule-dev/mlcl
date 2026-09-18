# Property Listing

- **slug**: `property-listing`
- **cluster**: real-estate-travel
- **type**: full-stack
- **layout**: landing

Zillow-like property listing platform with search, maps, filters, and mortgage calculator

> **This is a complete, working app, already built.** The data model, handlers, and screens below all exist on disk (paths shown). Treat this as the user's existing codebase: **adapt the listed files in place** for the request; do not recreate tables, handlers, or pages that already exist, and do not add packages for functionality already implemented here.

## Features

`auth`, `search`, `maps`, `bookmarks`, `reviews`

## Data model (10 domain tables)

_Already created by the existing SQL in `api/migrations/` — do NOT add new migrations for these tables._

- **agents** — id, name, email, phone, bio, city, specialty, rating, active, created_at, updatedAt
- **bookmarks** — id, userId, resourceType, resourceId, folder, createdAt, updatedAt
- **devices** — id, createdAt, updatedAt, userId, name, pushPlatform, pushSubscription, hasPushSubscription
- **leads** — id, agent_id, property_id, name, email, phone, message, source, status, assigned_to, created_at, updated_at, …
- **properties** — id, owner_id, title, description, address, city, state, zip_code, price, bedrooms, bathrooms, square_feet, …
- **resource_tags** — id, tagId, resourceType, resourceId, createdAt
- **review_helpful** — reviewId, userId, createdAt
- **reviews** — id, resourceType, resourceId, userId, rating, title, body, helpful, createdAt, updatedAt
- **showings** — id, property_id, agent_id, lead_id, scheduled_at, duration_min, status, notes, created_at, updated_at, updatedAt
- **tags** — id, name, slug, color, description, createdAt, updatedAt

## API surface (handlers)

_These endpoints already exist — open and extend the named file, never recreate it._

- **agents** — `api/src/handlers/agents.ts`
- **bookmarks** — `api/src/handlers/bookmarks.ts`
- **leads** — `api/src/handlers/leads.ts`
- **mortgage** — `api/src/handlers/mortgage.ts`
- **properties** — `api/src/handlers/properties.ts`
- **showings** — `api/src/handlers/showings.ts`

## Screens (15)

_These pages already exist — edit the named file in place, never create a parallel one._

- **AgentAnalyticsPage** `/admin/analytics` (auth) → `app/src/pages/AgentAnalyticsPage.tsx`
- **AgentDashboard** `/admin/dashboard` (auth) → `app/src/pages/AgentDashboard.tsx`
- **AgentLeadsPage** `/admin/leads` (auth) → `app/src/pages/AgentLeadsPage.tsx`
- **AgentListingsPage** `/admin/listings` (auth) → `app/src/pages/AgentListingsPage.tsx`
- **AgentProfilePage** `/agent/:id` → `app/src/pages/AgentProfilePage.tsx`
- **AgentShowingsPage** `/admin/showings` (auth) → `app/src/pages/AgentShowingsPage.tsx`
- **ForgotPassword** `/forgot-password` → `app/src/pages/ForgotPassword.tsx`
- **ListingEditorPage** `/admin/listings/new` (auth) → `app/src/pages/ListingEditorPage.tsx`
- **Login** `/login` → `app/src/pages/Login.tsx`
- **PropertyDetailPage** `/property/:id` → `app/src/pages/PropertyDetailPage.tsx`
- **ResetPassword** `/reset-password` → `app/src/pages/ResetPassword.tsx`
- **SavedPropertiesPage** `/saved` → `app/src/pages/SavedPropertiesPage.tsx`
- **SearchPage** `/` → `app/src/pages/SearchPage.tsx`
- **Settings** `/admin/settings` (auth) → `app/src/pages/Settings.tsx`
- **Signup** `/signup` → `app/src/pages/Signup.tsx`

## Subscription tiers

free / pro / team — gated by: maxListings, maxPhotosPerListing, maxStorageMb, featuredListings, virtualTours, mortgageCalculator, leadCapture, customBranding, agentAccounts

## Integrations (17 @molecule/* packages)

- **Auth & permissions**: `@molecule/api-oauth-google`, `@molecule/api-oauth-github`
- **Database**: `@molecule/api-database-postgresql`
- **Domain resources**: `@molecule/api-resource-user`, `@molecule/api-resource-bookmark`, `@molecule/api-resource-review`, `@molecule/api-resource-tag`
- **Email**: `@molecule/api-emails-mailgun`
- **Frontend / UI**: `@molecule/app-maps`, `@molecule/app-gallery`, `@molecule/app-virtual-scroll`, `@molecule/app-data-table`, `@molecule/app-date-range-picker`
- **Other API**: `@molecule/api-geolocation-mapbox`
- **Search**: `@molecule/api-search-meilisearch`
- **Uploads & media**: `@molecule/api-image-sharp`, `@molecule/api-uploads-s3`

## Required secrets

- DATABASE_URL — PostgreSQL connection string
- MAPBOX_ACCESS_TOKEN — Mapbox API access token
- MEILISEARCH_API_KEY — Meilisearch API key
- S3_BUCKET — S3 bucket for property photos
- MAILGUN_API_KEY — Mailgun API key for email alerts
