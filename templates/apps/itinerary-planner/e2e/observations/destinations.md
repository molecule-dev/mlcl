# Page observations: /destinations

> Filled by AI agent driving the live itinerary-planner smoke-app via
> Playwright after signup.

## Page state assumed

- [x] Auth required

## Elements

| selector / accessible name                      | role         | expected behavior on interaction                 | success signal                  | failure signal                          |
| ----------------------------------------------- | ------------ | ------------------------------------------------ | ------------------------------- | --------------------------------------- |
| `getByRole('heading', { name: /destinations     | editor.*pick | where.*next/i })`                                | heading                         | static page H1                          | visible         | missing   |
| `[data-testid="destinations-grid"]`             | generic      | populated grid of destination cards              | rows visible                    | empty grid                              |
| `[data-testid="destinations-pill-editor-pick"]` | button       | toggles the "Editor pick" filter pill            | grid filtered                   | nothing happens                         |
| `getByRole('link', { name: /reykjav.*ring road  | kyoto        | lisbon/i }).first()`                             | link                            | follows /destinations?focus=… deep link | URL has ?focus= | dead link |
| `[data-testid="destinations-empty"]`            | generic      | empty-state visible when filter has zero results | visible after impossible filter | always hidden                           |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | —             | —                                            |

## Network calls expected during normal use

| trigger | method | path              | what request body or query is expected |
| ------- | ------ | ----------------- | -------------------------------------- |
| Mount   | GET    | /api/destinations | auth header only                       |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/destinations.spec.ts`
