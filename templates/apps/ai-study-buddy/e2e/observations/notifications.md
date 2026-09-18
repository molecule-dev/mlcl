# Page observations: /notifications (User notification feed)

Captured via `node scripts/observe-page.mjs ai-study-buddy /notifications --auth`.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                    | role        | expected behavior on interaction                                             | success signal                                 | failure signal         |
| --------------------------------------------- | ----------- | ---------------------------------------------------------------------------- | ---------------------------------------------- | ---------------------- |
| `[data-mol-id="page-notifications"]`          | container   | top-level wrapper renders                                                    | visible                                        | redirected to `/login` |
| `[data-mol-id="notifications-filter-all"]`    | link/button | shows all notifications                                                      | URL stays at `/notifications`; list unfiltered | filter ignored         |
| `[data-mol-id="notifications-filter-unread"]` | link/button | filters to unread only via `?filter=unread`                                  | URL gets `?filter=unread`                      | filter ignored         |
| `[data-mol-id="notifications-mark-all"]`      | button      | (only when unread > 0) marks all read via POST `/api/notifications/read-all` | unread count drops to 0                        | call 4xx / no change   |
| `[data-mol-id="notifications-item"]`          | listitem    | clickable notification row (one per item)                                    | click navigates to its `href`, marks read      | click doesn't fire     |
| `[data-mol-id="notifications-mark-read"]`     | button      | per-item mark-as-read button                                                 | item moves to read state                       | unchanged              |
| `[data-mol-id="notifications-empty"]`         | container   | empty-state for fresh users                                                  | visible when 0 notifications                   | hidden incorrectly     |

## Hidden surfaces opened from this page

| trigger                    | what it opens                                          | elements inside (selector / role / behavior) |
| -------------------------- | ------------------------------------------------------ | -------------------------------------------- |
| Click `notifications-item` | navigation to the item's `href` (e.g. /flashcards/:id) | target page renders                          |

## Network calls expected during normal use

| trigger             | method | path                               | what request body or query is expected |
| ------------------- | ------ | ---------------------------------- | -------------------------------------- |
| page mount          | GET    | `/api/notifications`               | `{ data: [...], unread_count }`        |
| filter=unread click | GET    | `/api/notifications?filter=unread` | filtered list                          |
| Mark-all click      | POST   | `/api/notifications/read-all`      | empty body                             |
| Per-item mark click | POST   | `/api/notifications/:id/read`      | empty body                             |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/30-notifications.spec.ts`
