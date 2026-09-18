# Page observations: /events (Events)

> Filled by the dispatch-flagship agent driving the running app via Playwright MCP.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                            | role       | expected behavior on interaction  | success signal           | failure signal    |
| ----------------------------------------------------- | ---------- | --------------------------------- | ------------------------ | ----------------- |
| `getByRole('heading', { name: /events/i, level: 1 })` | heading    | render the events catalog title   | visible                  | absent            |
| Event-type rows                                       | row / link | navigate to /events/:id           | URL becomes the id route | stays             |
| Empty-state body                                      | text       | shown when zero events have fired | visible while empty      | hidden when empty |
| Search input                                          | textbox    | filter rows by name               | matches narrow the list  | unchanged         |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | (none)        | (none)                                       |

## Network calls expected during normal use

| trigger    | method | path        | what request body or query is expected |
| ---------- | ------ | ----------- | -------------------------------------- |
| Page mount | GET    | /api/events | hydrate event catalog                  |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/events.spec.ts`
