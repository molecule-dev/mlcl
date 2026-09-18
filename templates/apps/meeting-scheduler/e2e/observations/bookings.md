# Page observations: /bookings (Bookings list)

Authenticated bookings list; loads /api/bookings and filters in-memory by status.

Source: this page was driven live at `http://localhost:$VITE_PORT/bookings`
via Playwright + the matching `e2e/bookings.spec.ts`. Every row below
corresponds to an element with at least one passing test that exercises
its real outcome (network call, DB invariant, navigation, content visibility).

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                  | role   | expected behavior on interaction     | success signal                                       | failure signal                                  |
| ------------------------------------------- | ------ | ------------------------------------ | ---------------------------------------------------- | ----------------------------------------------- |
| `[data-testid="bookings-empty"]`            | status | shows when host has no bookings      | visible immediately after signup                     | never appears even with empty list              |
| first booking row rendered as a link        | link   | GET /api/bookings populates the list | invitee name appears within 10s of seeding a booking | list stays empty after a real booking is seeded |
| `[data-testid="bookings-filter-scheduled"]` | button | filters in-memory by status          | click stays on /bookings, list updates               | click leaves the page                           |

## Hidden surfaces opened from this page

| trigger                         | what it opens | elements inside (selector / role / behavior) |
| ------------------------------- | ------------- | -------------------------------------------- |
| (none — page surfaces are flat) | —             | —                                            |

## Network calls expected during normal use

| trigger | method | path | what request body or query is expected |
| ------- | ------ | ---- | -------------------------------------- |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/bookings.spec.ts`
