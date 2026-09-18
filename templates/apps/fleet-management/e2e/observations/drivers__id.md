# Page observations: /drivers/:id (Driver detail)

> Filled by the dispatch-flagship agent driving the running app via Playwright MCP.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`).
- [x] `:id` resolves to a real seeded driver (use the first row from `/drivers` list).

## Elements

| selector / accessible name                      | role    | expected behavior on interaction                              | success signal                            | failure signal         |
| ----------------------------------------------- | ------- | ------------------------------------------------------------- | ----------------------------------------- | ---------------------- |
| `getByRole('link', { name: /all drivers/i })`   | link    | navigate back to `/drivers`                                   | URL ends with `/drivers`                  | stays                  |
| Avatar circle (initials)                        | text    | first 2 initials of driver name                               | non-empty 1-2 letter monogram             | empty circle           |
| `getByRole('heading', { level: 1 })`            | heading | shows driver name                                             | non-empty heading                         | "Driver not found."    |
| Header subtitle                                 | text    | shows `<class> · <license_number> · expires <date>`           | full subtitle visible                     | partial / empty        |
| Stat: Safety score                              | text    | `driver.safety_score` (50-100)                                | numeric, accent-coloured                  | NaN                    |
| Stat: Total miles                               | text    | `driver.total_miles` formatted                                | numeric                                   | NaN                    |
| Stat: Hours today                               | text    | `driver.hours_today` to 1dp + "h"                             | matches `\\d+\\.\\dh`                     | "NaNh"                 |
| Stat: Hours this week                           | text    | `<hours_week> / <hours_max_week>` h, error-coloured if `>85%` | matches `\\d+\\.\\d / \\d+ h`             | "NaN"                  |
| Contact section "Email" KV                      | text    | `driver.email`                                                | valid-looking email                       | empty                  |
| Contact section "Phone" KV                      | text    | `driver.phone` (font-mono)                                    | non-empty phone                           | empty                  |
| Contact section "Hire date" KV                  | text    | localized hire date                                           | non-empty date                            | empty                  |
| Assignment section vehicle link (when assigned) | link    | navigate to `/vehicles/<vehicle_id>`                          | URL changes                               | stays                  |
| Assignment fallback "No vehicle assigned."      | text    | only when `vehicle_plate === null`                            | text visible                              | absent when no vehicle |
| Certifications chips                            | text    | each cert in `driver.certifications` rendered as a chip       | at least one chip when seeded             | always empty           |
| Recent trips list                               | list    | up to 6 most-recent trips for this driver                     | at least one row                          | empty list             |
| Recent-trip "events" warning                    | text    | rendered inline with trip when `events > 0`                   | warning text visible only when events > 0 | always shown           |

## Hidden surfaces opened from this page

| trigger                   | what it opens | elements inside (selector / role / behavior) |
| ------------------------- | ------------- | -------------------------------------------- |
| (none — read-only detail) | n/a           | n/a                                          |

## Network calls expected during normal use

| trigger                  | method | path                     | what request body or query is expected |
| ------------------------ | ------ | ------------------------ | -------------------------------------- |
| Initial mount            | GET    | /api/drivers/:id         | shaped driver record                   |
| Initial mount (parallel) | GET    | /api/trips?driver_id=:id | trips filtered by driver, top 6        |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/drivers.spec.ts` (detail-section)
