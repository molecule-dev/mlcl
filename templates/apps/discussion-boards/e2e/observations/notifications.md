# Page observations: /notifications (Notifications)

> Authenticated activity inbox. Loads `/api/notifications`, supports
> "All" / "Unread" filter chips, "Mark all read" button posts to
> `/api/notifications/mark-all-read` and flips the unread count.

## Page state assumed

- [x] Authenticated

## Elements

| selector / accessible name                                 | role    | expected behavior on interaction                   | success signal                     | failure signal             |
| ---------------------------------------------------------- | ------- | -------------------------------------------------- | ---------------------------------- | -------------------------- |
| heading "Notifications · N unread"                         | heading | renders with unread count                          | unread count integer present       | NaN or `{{count}}` literal |
| filter chip "All"                                          | button  | shows all notifications                            | list shows both read + unread      | filter unchanged           |
| filter chip "Unread"                                       | button  | shows only unread                                  | filtered list rendered             | filter unchanged           |
| `getByRole('button', { name: /Mark all read/i })`          | button  | POST /api/notifications/mark-all-read              | unread-count → 0 on next read      | count unchanged            |
| Mark-all-read disabled when 0 unread                       | n/a     | button has `disabled` attribute                    | button has `:disabled` style       | always enabled             |
| empty state                                                | n/a     | "You're all caught up" copy when list is empty     | text visible                       | renders ghost rows         |
| populated state — second user reply creates a notification | n/a     | a reply from another user shows up here for the OP | row referencing the thread visible | no row                     |

## Network calls expected during normal use

| trigger             | method | path                               | what request body or query is expected                    |
| ------------------- | ------ | ---------------------------------- | --------------------------------------------------------- |
| route load          | GET    | `/api/notifications`               | 200 with `{ data: [...] }`                                |
| Mark all read click | POST   | `/api/notifications/mark-all-read` | 200, then GET `/api/notifications/unread-count` returns 0 |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/notifications.spec.ts`
