# Page observations: /deliveries (Deliveries)

> Filled by the dispatch-flagship agent driving the running app via Playwright MCP.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                                | role         | expected behavior on interaction              | success signal                   | failure signal         |
| --------------------------------------------------------- | ------------ | --------------------------------------------- | -------------------------------- | ---------------------- |
| `getByRole('heading', { name: /deliveries/i, level: 1 })` | heading      | render the page title                         | visible                          | absent                 |
| Empty-state body                                          | text         | shown when no deliveries exist                | visible while list empty         | hidden when empty      |
| Delivery row links                                        | link         | navigate to `/deliveries/:id`                 | URL becomes the id route         | stays on `/deliveries` |
| Filter chips (all / failed / retrying)                    | radio/button | narrow the table to a status                  | only matching rows visible       | unfiltered             |
| Search input                                              | textbox      | filter by URL / response code / endpoint name | rendered list shrinks to matches | unchanged              |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | (none)        | (none)                                       |

## Network calls expected during normal use

| trigger    | method | path            | what request body or query is expected |
| ---------- | ------ | --------------- | -------------------------------------- |
| Page mount | GET    | /api/deliveries | full list newest-first                 |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/deliveries.spec.ts`
