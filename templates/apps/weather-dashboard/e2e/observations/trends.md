# Page observations: /trends (Historical Observations)

> Filled by the dispatch-flagship agent on a freshly-scaffolded
> smoke-app served from VITE_PORT=3000 / API_PORT=4000.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                                            | role   | expected behavior on interaction                                   | success signal                                      | failure signal    |
| --------------------------------------------------------------------- | ------ | ------------------------------------------------------------------ | --------------------------------------------------- | ----------------- |
| `getByRole('button', { name: /temperature/i })` (metric tile)         | button | flip activeMetric → temperature, chart re-extracts temp_avg series | aria-pressed=true                                   | unchanged         |
| `getByRole('button', { name: /precipitation/i })` (metric tile)       | button | flip activeMetric → precipitation_mm                               | aria-pressed=true                                   | unchanged         |
| `getByRole('button', { name: /wind/i })` (metric tile)                | button | flip activeMetric → wind_speed_avg                                 | aria-pressed=true                                   | unchanged         |
| `getByRole('button', { name: /humidity/i })` (metric tile)            | button | flip activeMetric → humidity                                       | aria-pressed=true                                   | unchanged         |
| `getByRole('button', { name: /^7 days$/i })`                          | range  | re-fetch /api/history with `from=7d`                               | aria-pressed=true + new GET fires                   | unchanged         |
| `getByRole('button', { name: /^30 days$/i })`                         | range  | re-fetch /api/history with `from=30d`                              | aria-pressed=true                                   | unchanged         |
| `main svg` (chart)                                                    | svg    | render the path when ≥2 history rows exist                         | path renders + summary cards show high/low/avg/days | empty placeholder |
| `getByRole('link', { name: /manage locations/i })` (no-default state) | link   | navigate to /locations                                             | URL becomes /locations                              | stays on /trends  |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior)       |
| ------- | ------------- | -------------------------------------------------- |
| (none)  | —             | trends is flat — metric/range buttons + chart only |

## Network calls expected during normal use

| trigger                  | method | path                     | what request body or query is expected                                              |
| ------------------------ | ------ | ------------------------ | ----------------------------------------------------------------------------------- |
| page load                | GET    | /api/locations/default   | (default location id for fetching history)                                          |
| page load (with default) | GET    | /api/history/:locationId | `?from=YYYY-MM-DD&to=YYYY-MM-DD` — server returns rows with temp_avg/temp_high/etc. |
| Range button click       | GET    | /api/history/:locationId | (re-fetches with new from/to)                                                       |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/trends.spec.ts`
