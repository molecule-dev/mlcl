# Page observations: /notifications (Notifications)

> Filled by the dispatch-flagship agent driving the running app via Playwright MCP.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                                   | role         | expected behavior on interaction                                 | success signal                           | failure signal |
| ------------------------------------------------------------ | ------------ | ---------------------------------------------------------------- | ---------------------------------------- | -------------- |
| `getByRole('heading', { name: /notifications/i, level: 1 })` | heading      | render the page title                                            | visible                                  | absent         |
| Filter chips (all / critical / unread)                       | radio/button | narrow list by category                                          | only matching rows visible               | unfiltered     |
| Notification rows                                            | listitem     | each row links to its target endpoint/delivery                   | click navigates to relevant detail       | stale / no nav |
| `getByRole('button', { name: /mark all read/i })`            | button       | POST /api/notifications/read-all flips every row to is_read=true | next GET shows is_read=true on every row | unread remains |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | (none)        | (none)                                       |

## Network calls expected during normal use

| trigger       | method | path                        | what request body or query is expected |
| ------------- | ------ | --------------------------- | -------------------------------------- |
| Page mount    | GET    | /api/notifications          | hydrate the list                       |
| Mark all read | POST   | /api/notifications/read-all | (empty body)                           |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/notifications.spec.ts`
