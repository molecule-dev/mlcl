# Page observations: /book/:slug (Public booking)

Public booking page; reads /api/event-types/by-slug/:slug + /availability and posts /api/bookings/public.

Source: this page was driven live at `http://localhost:$VITE_PORT/book/:slug`
via Playwright + the matching `e2e/book__slug.spec.ts`. Every row below
corresponds to an element with at least one passing test that exercises
its real outcome (network call, DB invariant, navigation, content visibility).

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name           | role    | expected behavior on interaction                            | success signal                                              | failure signal                        |
| ------------------------------------ | ------- | ----------------------------------------------------------- | ----------------------------------------------------------- | ------------------------------------- |
| `[data-testid="booking-page-event"]` | heading | renders event type name and duration                        | visible after slug load                                     | page shows error state for valid slug |
| `[data-testid="booking-page-host"]`  | text    | renders host display name                                   | visible after fetch                                         | never resolves                        |
| `[data-testid="day-N"]`              | button  | selects a calendar day; reloads /availability for that date | time slots appear for available days                        | all 14 days appear booked-out         |
| `getByRole("option")`                | option  | selects a real time slot                                    | enabled options become clickable                            | no slots render                       |
| `[data-testid="booking-confirm"]`    | button  | POST /api/bookings/public creates the booking               | 201 + cancellationToken + redirect to /book/:slug/confirmed | 4xx/5xx surfaced as inline error      |

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
- [x] All elements above have a corresponding test in `e2e/book__slug.spec.ts`
