# Page observations: /notifications (notifications)

> Filled by the dispatch-flagship agent driving the running app via Playwright MCP.
> Each row corresponds to a real DOM element observed in the rendered page,
> not derived from source-code reading.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                              | role      | expected behavior on interaction | success signal                     | failure signal             |
| ------------------------------------------------------- | --------- | -------------------------------- | ---------------------------------- | -------------------------- |
| `getByRole("heading", { name: /Activity/i, level: 1 })` | heading   | render Activity heading          | visible                            | absent                     |
| `getByRole("button", { name: /Mark all read/i })`       | button    | PUT /api/notifications/mark-read | request issued, unread count zeros | no network call            |
| `getByRole("listitem")` (notification rows)             | listitem  | render seeded notifications      | count >= 1                         | list empty                 |
| `getByRole("heading", { name: /today                    | this week | earlier/i })`                    | heading                            | group notifications by day | at least one group heading visible | no grouping |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | (none)        | (none)                                       |

## Network calls expected during normal use

| trigger             | method | path                         | what request body or query is expected |
| ------------------- | ------ | ---------------------------- | -------------------------------------- |
| page load           | GET    | /api/notifications           | (none)                                 |
| Mark all read click | PUT    | /api/notifications/mark-read | {}                                     |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/notifications.spec.ts`
