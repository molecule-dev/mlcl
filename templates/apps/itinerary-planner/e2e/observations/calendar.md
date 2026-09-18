# Page observations: /calendar

> Filled by AI agent driving the live itinerary-planner smoke-app via
> Playwright after signup + creating a trip.

## Page state assumed

- [x] Auth required

## Elements

| selector / accessible name                     | role    | expected behavior on interaction                     | success signal                  | failure signal   |
| ---------------------------------------------- | ------- | ---------------------------------------------------- | ------------------------------- | ---------------- |
| `getByRole('heading', { name: /calendar        | month   | trips/i })`                                          | heading                         | calendar page H1 | visible                      | missing             |
| `[data-testid="calendar-month-header"]`        | generic | renders the active month label                       | text reflects the current month | missing          |
| `getByRole('button', { name: /next             | prev    | forward                                              | back/i }).first()`              | button           | navigates the rendered month | header text changes | nothing happens |
| `getByRole('link', { name: /Iceland Loop/i })` | link    | follows /trips/:id from a trip block on the calendar | URL contains /trips/            | dead link        |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | —             | —                                            |

## Network calls expected during normal use

| trigger | method | path       | what request body or query is expected                |
| ------- | ------ | ---------- | ----------------------------------------------------- |
| Mount   | GET    | /api/trips | auth header (calendar derives blocks from trip dates) |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/calendar.spec.ts`
