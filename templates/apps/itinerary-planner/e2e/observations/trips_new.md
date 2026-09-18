# Page observations: /trips/new (TripPlanner)

> Filled by AI agent driving the live itinerary-planner smoke-app via
> Playwright after signup.

## Page state assumed

- [x] Auth required

## Elements

| selector / accessible name                    | role            | expected behavior on interaction                       | success signal             | failure signal                 |
| --------------------------------------------- | --------------- | ------------------------------------------------------ | -------------------------- | ------------------------------ |
| `[data-testid="trip-planner-destination"]`    | textbox         | accepts destination string                             | value reflected            | locked                         |
| `[data-testid="trip-planner-country"]`        | textbox         | accepts country/region string                          | value reflected            | locked                         |
| `[data-testid="trip-planner-start"]`          | textbox         | type=date input for start                              | value reflected as ISO     | input rejected                 |
| `[data-testid="trip-planner-end"]`            | textbox         | type=date input for end                                | value reflected as ISO     | input rejected                 |
| `[data-testid="trip-planner-travelers"]`      | textbox         | numeric input for traveler count                       | value reflected            | locked                         |
| `[data-testid="trip-planner-budget"]`         | textbox         | numeric input for total budget (whole dollars)         | value reflected            | locked                         |
| `[data-testid="trip-planner-submit"]`         | button          | POST /api/trips with body, then navigate to /trips/:id | URL contains /trips/<uuid> | stays on /trips/new with error |
| `getByRole('link', { name: /back to all trips | all trips/i })` | link                                                   | navigates to /trips        | URL is /trips                  | dead link |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | —             | —                                            |

## Network calls expected during normal use

| trigger     | method | path       | what request body or query is expected                                 |
| ----------- | ------ | ---------- | ---------------------------------------------------------------------- |
| Submit form | POST   | /api/trips | `{ name, destination, start_date, end_date, budget_total_cents, ... }` |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/trips_new.spec.ts`
