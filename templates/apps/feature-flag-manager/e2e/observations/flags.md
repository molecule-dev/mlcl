# Page observations: /flags (Flags)

> Filled by the dispatch-flagship agent driving the running app via Playwright MCP.
> Each row corresponds to a real DOM element observed in the rendered page,
> not derived from source-code reading.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`); seeded with 3 flags

## Elements

| selector / accessible name                                           | role      | expected behavior on interaction           | success signal                          | failure signal    |
| -------------------------------------------------------------------- | --------- | ------------------------------------------ | --------------------------------------- | ----------------- |
| `getByRole('link', { name: /new flag/i }).first()`                   | link      | navigate to /flags/new                     | URL becomes /flags/new                  | stays             |
| `locator('input[placeholder*="Search flags"]')`                      | searchbox | filter list by key/name                    | non-matching flags hidden               | no filter applied |
| Env filter button "production"                                       | button    | filter list to Production env              | only production flags visible           | unchanged         |
| Env filter button "staging"                                          | button    | filter list to Staging env                 | only staging flags visible              | unchanged         |
| State filter button "off"                                            | button    | hide all flags currently on                | empty state visible (all seed flags on) | flags still shown |
| Flag row link `getByRole('link', { name: /onboarding-revamp-v3/i })` | link      | deep-link to /flags/:key                   | URL becomes /flags/onboarding-revamp-v3 | stays             |
| Inline toggle button on a flag row                                   | switch    | PUT /api/flags/:id/toggle, flip is_enabled | aria-pressed flips, DB row updated      | error toast       |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | (none)        | (none)                                       |

## Network calls expected during normal use

| trigger      | method | path                  | what request body or query is expected |
| ------------ | ------ | --------------------- | -------------------------------------- |
| page load    | GET    | /api/flags            | (none)                                 |
| Toggle click | PUT    | /api/flags/:id/toggle | { environmentId }                      |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/11-flags.spec.ts`
