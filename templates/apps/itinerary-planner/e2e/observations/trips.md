# Page observations: /trips

> Filled by AI agent driving the live itinerary-planner smoke-app via
> Playwright after signup.

## Page state assumed

- [x] Auth required

## Elements

| selector / accessible name                     | role        | expected behavior on interaction        | success signal           | failure signal          |
| ---------------------------------------------- | ----------- | --------------------------------------- | ------------------------ | ----------------------- |
| `getByRole('heading')`                         | heading     | trips index H1                          | visible                  | missing                 |
| `getByRole('link', { name: /new trip           | start.*trip | plan/i })`                              | link                     | navigates to /trips/new | URL is /trips/new | dead link |
| `[data-testid="trips-empty"]`                  | generic     | empty-state card visible when no trips  | visible until first trip | always hidden           |
| `[data-testid="trips-live"]`                   | generic     | live trip grid present after first trip | visible after creating   | hidden after creating   |
| `[data-testid="trips-past"]`                   | generic     | past trip grid for completed trips      | visible when relevant    | broken layout           |
| `getByRole('link', { name: /Iceland Loop/i })` | link        | follows /trips/:id detail link          | URL contains /trips/     | dead link               |

## Hidden surfaces opened from this page

| trigger         | what it opens | elements inside (selector / role / behavior) |
| --------------- | ------------- | -------------------------------------------- |
| (none observed) | —             | —                                            |

## Network calls expected during normal use

| trigger | method | path       | what request body or query is expected |
| ------- | ------ | ---------- | -------------------------------------- |
| Mount   | GET    | /api/trips | auth header only                       |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/trips.spec.ts`
