# Page observations: /notifications

> Filled by AI agent driving the live itinerary-planner smoke-app via
> Playwright after signup.

## Page state assumed

- [x] Auth required

## Elements

| selector / accessible name                    | role     | expected behavior on interaction                                 | success signal                   | failure signal |
| --------------------------------------------- | -------- | ---------------------------------------------------------------- | -------------------------------- | -------------- |
| `getByRole('heading', { name: /notifications  | activity | today/i })`                                                      | heading                          | page H1        | visible | missing |
| `[data-testid="notifications-mark-all-read"]` | button   | POST /api/notifications/mark-all-read → `read: true` server-side | unread count drops to 0          | error or no-op |
| `[data-testid="notifications-empty"]`         | generic  | empty state shown when no notifications                          | visible for new user             | always hidden  |
| `[data-testid="notifications-list"]`          | generic  | populated list once notifications exist                          | visible after creating           | always hidden  |
| `[data-testid="notifications-row"]`           | generic  | one row per notification                                         | visible after POST               | missing        |
| `[data-testid="notifications-toggle"]`        | button   | PUT /api/notifications/:id flips `read` flag                     | row state inverted, GET reflects | unchanged      |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | —             | —                                            |

## Network calls expected during normal use

| trigger       | method | path                             | what request body or query is expected |
| ------------- | ------ | -------------------------------- | -------------------------------------- |
| Mount         | GET    | /api/notifications               | auth header                            |
| Mark all read | POST   | /api/notifications/mark-all-read | (no body)                              |
| Toggle row    | PUT    | /api/notifications/:id           | `{ read: bool }`                       |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/notifications.spec.ts`
