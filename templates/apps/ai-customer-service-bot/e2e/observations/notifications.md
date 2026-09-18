# Page observations: /notifications (Notifications)

Captured from `browser_snapshot` on `http://localhost:3100/notifications`
after `signup(page)`. Single-column page with title, "Mark all read"
CTA, "Quiet hours" toggle, a filter row, and either a list of
`NotificationRow`s or the empty state.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                                                    | role      | expected behavior on interaction                          | success signal                                  | failure signal  |
| ----------------------------------------------------------------------------- | --------- | --------------------------------------------------------- | ----------------------------------------------- | --------------- |
| `[data-mol-id="page-notifications"]`                                          | container | renders after auth                                        | element visible                                 | missing         |
| `[data-mol-id="notifications-mark-all"]`                                      | button    | POST /api/notifications/read-all (disabled when unread=0) | request fires when there is unread; rows reload | nothing happens |
| `[data-mol-id="notifications-quiet-checkbox"]`                                | checkbox  | toggles local quiet-hours preference flag                 | input checked toggles                           | unchanged       |
| `[data-mol-id="notifications-filter-all"]`                                    | button    | resets active filter to all                               | the filter chip becomes active                  | no change       |
| `[data-mol-id="notifications-filter-escalation"]`                             | button    | filters list to escalation events                         | only escalation rows visible (or empty)         | no change       |
| `[data-mol-id="notifications-filter-mention"]`                                | button    | filters list to mention events                            | only mention rows visible (or empty)            | no change       |
| `[data-mol-id="notifications-empty"]` OR `[data-mol-id="notifications-list"]` | container | renders one of the two terminal states                    | one is visible after load                       | neither visible |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | —             | —                                            |

## Network calls expected during normal use

| trigger               | method | path                        | what request body or query is expected |
| --------------------- | ------ | --------------------------- | -------------------------------------- |
| Page load             | GET    | /api/notifications          | array of `NotificationRow`             |
| Click "Mark all read" | POST   | /api/notifications/read-all | empty body                             |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/notifications.spec.ts`
