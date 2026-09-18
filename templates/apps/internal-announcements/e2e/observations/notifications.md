# Page observations: /notifications (Notifications)

> Filled by the dispatch-flagship agent driving the running app via Playwright MCP.

## Page state assumed

- [x] Authenticated

## Elements

| selector / accessible name                        | role                     | expected behavior on interaction | success signal                                  | failure signal            |
| ------------------------------------------------- | ------------------------ | -------------------------------- | ----------------------------------------------- | ------------------------- |
| `getByTestId("notif-filter-all")`                 | button                   | shows all notifications          | active filter, list shows all                   | nothing                   |
| `getByTestId("notif-filter-channel")`             | button                   | filters to channel posts         | only channel notifications visible              | other types still visible |
| `getByTestId("notif-filter-mention")`             | button                   | filters to @-mentions            | only mentions visible                           | other types still visible |
| `getByTestId("notif-filter-ack")`                 | button                   | filters to ack reminders         | only ack notifications visible                  | other types still visible |
| `getByRole("button", { name: /Mark all read/i })` | button                   | clears unread badge              | unread count drops to 0, persists across reload | unread count unchanged    |
| notification row link                             | link `/announcement/:id` | navigates to that announcement   | URL changes                                     | stays                     |
| `getByText(/no notifications                      | empty/i)` (empty state)  | text                             | when feed is empty                              | visible                   | not present |
| `getByRole("button", { name: /Sign out            | SIGN OUT/i })`           | button                           | logs out                                        | URL `/login`              | unchanged   |
| `getByRole("button", { name: /Toggle theme/i })`  | button                   | flips theme                      | `data-mol-mode` flips                           | unchanged                 |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |

## Network calls expected during normal use

| trigger   | method | path                                    | what request body or query is expected |
| --------- | ------ | --------------------------------------- | -------------------------------------- |
| Page load | GET    | `/api/announcements`                    | list announcements                     |
| Page load | GET    | `/api/announcements/me/acknowledgments` | acks                                   |
| Page load | GET    | `/api/team`                             | team members                           |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/notifications.spec.ts`
