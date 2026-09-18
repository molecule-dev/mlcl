# Sports League

- **slug**: `sports-league`
- **cluster**: operations-iot
- **type**: full-stack
- **layout**: dashboard

ESPN fantasy-like app with teams, schedules, scores, and standings

> **This is a complete, working app, already built.** The data model, handlers, and screens below all exist on disk (paths shown). Treat this as the user's existing codebase: **adapt the listed files in place** for the request; do not recreate tables, handlers, or pages that already exist, and do not add packages for functionality already implemented here.

## Features

`auth`, `search`, `realtime`, `calendar`, `reporting`, `notifications`

## Data model (12 domain tables)

_Already created by the existing SQL in `api/migrations/` — do NOT add new migrations for these tables._

- **devices** — id, createdAt, updatedAt, userId, name, pushPlatform, pushSubscription, hasPushSubscription
- **divisions** — id, league_id, name, conference, created_at, updated_at
- **favorite_teams** — id, user_id, team_id, created_at
- **game_events** — id, game_id, occurred_at, period, game_clock, type, team_id, player_id, description, score_home, score_away, created_at
- **games** — id, league_id, season, week, home_team_id, away_team_id, scheduled_at, date, time, venue, home_score, away_score, …
- **leagues** — id, name, sport, season, division_count, status, owner_user_id, created_at, updated_at
- **notifications** — id, user_id, type, title, body, href, read, created_at
- **player_stats** — id, match_id, player_id, team_id, points, assists, rebounds, fouls, minutes_played, extra, created_at, updated_at
- **players** — id, team_id, first_name, last_name, name, jersey_number, position, height, weight, photo_url, birthdate, status, …
- **roster_entries** — id, team_id, player_id, joined_at, left_at, role, created_at
- **teams** — id, league_id, division_id, name, abbreviation, city, logo_url, primary_color, secondary_color, division, owner_user_id, wins, …
- **payments** — id, createdAt, updatedAt, userId, transactionId, productId, platformKey, data, receipt

## API surface (handlers)

_These endpoints already exist — open and extend the named file, never recreate it._

- **\_seed** — `api/src/handlers/_seed.ts`
- **\_test** — `api/src/handlers/_test.ts`
- **favorite-teams** — `api/src/handlers/favorite-teams.ts`
- **notifications** — `api/src/handlers/notifications.ts`
- **players** — `api/src/handlers/players.ts`
- **profile** — `api/src/handlers/profile.ts`
- **schedule** — `api/src/handlers/schedule.ts`
- **scores** — `api/src/handlers/scores.ts`
- **standings** — `api/src/handlers/standings.ts`
- **stats** — `api/src/handlers/stats.ts`
- **teams** — `api/src/handlers/teams.ts`

## Screens (18)

_These pages already exist — edit the named file in place, never create a parallel one._

- **Landing** `/` → `app/src/pages/Landing.tsx`
- **Login** `/login` → `app/src/pages/Login.tsx`
- **Signup** `/signup` → `app/src/pages/Signup.tsx`
- **ForgotPassword** `/forgot-password` → `app/src/pages/ForgotPassword.tsx`
- **ResetPassword** `/reset-password` → `app/src/pages/ResetPassword.tsx`
- **Standings** `/standings` (auth) → `app/src/pages/Standings.tsx`
- **Teams** `/teams` (auth) → `app/src/pages/Teams.tsx`
- **TeamDetail** `/teams/:id` (auth) → `app/src/pages/TeamDetail.tsx`
- **Matches** `/matches` (auth) → `app/src/pages/Matches.tsx`
- **MatchDetail** `/matches/:id` (auth) → `app/src/pages/MatchDetail.tsx`
- **PlayerDetail** `/players/:id` (auth) → `app/src/pages/PlayerDetail.tsx`
- **Settings** `/settings` (auth) → `app/src/pages/Settings.tsx`
- **Dashboard** `/dashboard` (auth) → `app/src/pages/Dashboard.tsx`
- **Players** `/players` (auth) → `app/src/pages/Players.tsx`
- **Stats** `/stats` (auth) → `app/src/pages/Stats.tsx`
- **Schedule** `/schedule` (auth) → `app/src/pages/Schedule.tsx`
- **Profile** `/profile` (auth) → `app/src/pages/Profile.tsx`
- **Notifications** `/notifications` (auth) → `app/src/pages/Notifications.tsx`

## Subscription tiers

free / pro / team — gated by: maxSchedule, maxScores, maxStandings, maxTeams, advancedFeatures, canExport, retentionDays

## Integrations (11 @molecule/* packages)

- **Database**: `@molecule/api-database-postgresql`
- **Domain resources**: `@molecule/api-resource-user`
- **Frontend / UI**: `@molecule/app-data-table`, `@molecule/app-charts`, `@molecule/app-calendar`, `@molecule/app-command-palette`
- **Notifications**: `@molecule/api-push-notifications-web-push`
- **Other API**: `@molecule/api-reporting-database`
- **Realtime**: `@molecule/api-realtime-socketio`, `@molecule/app-realtime-socketio`
- **Search**: `@molecule/api-search-meilisearch`

## Required secrets

- DATABASE_URL — PostgreSQL connection string
- MEILISEARCH_API_KEY — MeiliSearch API key
