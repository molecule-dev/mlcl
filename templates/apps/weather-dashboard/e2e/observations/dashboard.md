# Page observations: /dashboard (Dashboard)

> Filled by the dispatch-flagship agent driving the running app via
> Playwright MCP on a freshly-scaffolded smoke-app served from
> VITE_PORT=3000 / API_PORT=4000.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                                     | role    | expected behavior on interaction                                   | success signal                               | failure signal                       |
| -------------------------------------------------------------- | ------- | ------------------------------------------------------------------ | -------------------------------------------- | ------------------------------------ |
| `getByRole('link', { name: /add a location/i })` (empty state) | link    | navigate to /locations to add first location                       | URL becomes /locations                       | stays on /dashboard / 404            |
| `main` (hero card)                                             | section | render real Open-Meteo current conditions for the default location | shows location name + N°F + condition text   | placeholder "—°F" / "Loading…" stuck |
| `main` (12-hour outlook strip)                                 | section | render 12 hourly forecast entries from `/api/forecasts/hourly/:id` | ≥6 hour labels (e.g. "12A", "1A", …) visible | strip empty / no labels              |
| `main` (7-day outlook strip)                                   | section | render 7 daily entries from `/api/forecasts/daily/:id`             | ≥5 day-of-week tokens (MON/TUE/…) visible    | strip empty                          |
| `getByRole('link', { name: /see trends/i })`                   | link    | navigate to /trends                                                | URL becomes /trends                          | stays on /dashboard                  |
| `main` (saved-locations list)                                  | list    | render every saved location with a link to `/location/:id`         | every saved-location name visible            | list empty when locations exist      |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior)                 |
| ------- | ------------- | ------------------------------------------------------------ |
| (none)  | —             | dashboard surfaces are flat — no menus/modals open from here |

## Network calls expected during normal use

| trigger                  | method | path                       | what request body or query is expected                                       |
| ------------------------ | ------ | -------------------------- | ---------------------------------------------------------------------------- |
| page load                | GET    | /api/locations/default     | (returns the user's default location or 404 if none)                         |
| page load (with default) | GET    | /api/forecasts/current/:id | (returns the cached current observation, refreshing via Open-Meteo if stale) |
| page load (with default) | GET    | /api/forecasts/hourly/:id  | (returns 24 hourly entries)                                                  |
| page load (with default) | GET    | /api/forecasts/daily/:id   | (returns 7 daily entries)                                                    |
| page load                | GET    | /api/locations             | (returns all the user's saved locations for the saved-locations strip)       |
| page load (with default) | GET    | /api/alerts                | (returns active alerts banner data)                                          |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/dashboard.spec.ts`
