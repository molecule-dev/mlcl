# Page observations: /trips (Trip log)

> Filled by the dispatch-flagship agent driving the running app via Playwright MCP.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`) — demo seed populates ~14 trips with start_location/end_location.

## Elements

| selector / accessible name                             | role         | expected behavior on interaction                                                      | success signal                                           | failure signal                       |
| ------------------------------------------------------ | ------------ | ------------------------------------------------------------------------------------- | -------------------------------------------------------- | ------------------------------------ |
| `getByText(/^trip log$/i)`                             | text         | eyebrow label above heading                                                           | uppercase eyebrow visible                                | absent                               |
| `getByRole('heading', { name: /^trips$/i, level: 1 })` | heading      | page heading                                                                          | heading visible                                          | shell error                          |
| `getByText(/last 30 days · \\d+ trips/i)`              | text         | subheader shows trip count from `/api/trips`                                          | non-zero count                                           | "0 trips"                            |
| `getByText(/\\d+(,\\d+)? mi total/i)`                  | text         | total miles chip — sum of `trips[].miles`                                             | dollar amount visible when list non-empty                | absent / NaN                         |
| `getByText(/[\\d.]+ gal fuel/i)`                       | text         | total fuel chip — sum of `trips[].fuel_used_gal`                                      | gallon amount visible                                    | absent / NaN                         |
| `getByText(/\\d+ events/i)` (conditional)              | text         | events chip — only rendered when `Σ events > 0`                                       | visible only when total events > 0                       | rendered when 0                      |
| `getByRole('table')`                                   | table        | trips table                                                                           | rows visible (≥10 with default seed)                     | empty body / "Failed to load trips." |
| `getByRole('columnheader', { name: /^date$/i })`       | columnheader | first column heading                                                                  | visible                                                  | missing                              |
| `getByRole('columnheader', { name: /^route$/i })`      | columnheader | route column heading                                                                  | visible                                                  | missing                              |
| First trip row "Route" cell                            | cell         | `origin → destination` populated from `trips.start_location` and `trips.end_location` | non-empty origin AND destination on either side of arrow | "→" with empty sides                 |
| First trip row "Miles" cell                            | cell         | `trips.miles` numeric                                                                 | numeric value                                            | NaN                                  |
| First trip row "Duration" cell                         | cell         | formatted `h Mm` from `duration_minutes`                                              | matches `\\d+h \\d+m`                                    | "NaNh NaNm"                          |
| First trip row "Events" cell                           | cell         | warning chip when `events > 0` else "—"                                               | chip OR "—"                                              | always "—" / always chip             |

## Hidden surfaces opened from this page

| trigger                                            | what it opens | elements inside (selector / role / behavior) |
| -------------------------------------------------- | ------------- | -------------------------------------------- |
| (none — read-only table; rows are non-interactive) | n/a           | n/a                                          |

## Network calls expected during normal use

| trigger       | method | path       | what request body or query is expected                                                     |
| ------------- | ------ | ---------- | ------------------------------------------------------------------------------------------ |
| Initial mount | GET    | /api/trips | full trip list (with `start_location` and `end_location` shaped as `origin`/`destination`) |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/trips.spec.ts`
