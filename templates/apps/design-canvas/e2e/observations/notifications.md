# Page observations: /notifications (Notifications)

> Filled by AI agent driving the running app via Playwright.

## Procedure walked

1. signup() → browser_navigate `/notifications`
2. browser_snapshot — left-rail filter (5 buttons), "Mark all as read" header action, content list grouped by bucket
3. After clicking each filter the right column re-renders with the matching subset

## Page state assumed

- [x] Authenticated (auth-guarded route — sign up first)

## Elements

| selector / accessible name                      | role   | expected behavior on interaction                    | success signal                                          | failure signal                    |
| ----------------------------------------------- | ------ | --------------------------------------------------- | ------------------------------------------------------- | --------------------------------- |
| `[data-mol-id="notifications-mark-all-read"]`   | button | PATCH `/api/notifications/read-all` and reload list | unread count drops to 0 on next load                    | network failure / count unchanged |
| `[data-mol-id="notifications-filter-all"]`      | button | sets filter to "all"                                | filter button highlighted                               | unchanged                         |
| `[data-mol-id="notifications-filter-unread"]`   | button | sets filter to "unread"                             | filter button highlighted                               | unchanged                         |
| `[data-mol-id="notifications-filter-mentions"]` | button | filters by `kind === 'mention'`                     | filter button highlighted                               | unchanged                         |
| `[data-mol-id="notifications-filter-comments"]` | button | filters by `kind === 'comment'`                     | filter button highlighted                               | unchanged                         |
| `[data-mol-id="notifications-filter-invites"]`  | button | filters by `kind === 'invite'`                      | filter button highlighted                               | unchanged                         |
| `[data-mol-id="notifications-list"]`            | region | renders bucketed notifications or empty-state       | bucket headings + items, OR `notifications-empty` block | nothing renders                   |

## Hidden surfaces opened from this page

| trigger     | what it opens                         | elements inside (selector / role / behavior) |
| ----------- | ------------------------------------- | -------------------------------------------- |
| empty inbox | `[data-mol-id="notifications-empty"]` | "You're all caught up" empty-state           |

## Network calls expected during normal use

| trigger               | method | path                          | what request body or query is expected |
| --------------------- | ------ | ----------------------------- | -------------------------------------- |
| initial render        | GET    | `/api/notifications`          | bearer-authed; returns user's inbox    |
| mark-all-read click   | PATCH  | `/api/notifications/read-all` | empty body                             |
| reload after mark-all | GET    | `/api/notifications`          | refreshed list                         |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/notifications.spec.ts`
