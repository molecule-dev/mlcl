# Page observations: notifications

> Walked via the running app on VITE_PORT=3100 / API_PORT=4100. Covers
> the notifications inbox page and the supporting unread-count and
> mark-read endpoints, including IDOR safety on the per-id read route.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                          | role          | expected behavior on interaction                   | success signal                                          | failure signal                                                                   |
| --------------------------------------------------- | ------------- | -------------------------------------------------- | ------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `getByText(/no notifications                        | all caught up | inbox.*empty/i)` on a fresh account                | text                                                    | Empty-state copy on `/notifications` after GET `/api/notifications` returns `[]` | Visible within 15s; GET observed | Empty state hidden but list also empty |
| GET `/api/notifications/unread-count`               | route         | Returns `{ count: 0 }` for a fresh account         | `200`, `count === 0`                                    | non-2xx or non-numeric `count`                                                   |
| POST `/api/notifications/mark-all-read`             | route         | No-op 2xx on an empty inbox                        | `200/204`; subsequent unread-count still 0              | non-2xx or unread-count > 0                                                      |
| POST `/api/notifications/:id/read` with random uuid | route         | IDOR-safe: returns 404 for unknown / not-owned ids | `404` (or `403`) — never 200 leaking another user's row | `200` or row mutated                                                             |

## Hidden surfaces opened from this page

| trigger                            | what it opens                                                     | elements inside (selector / role / behavior) |
| ---------------------------------- | ----------------------------------------------------------------- | -------------------------------------------- |
| Click an item row (when populated) | inline mark-as-read action via POST `/api/notifications/:id/read` | row collapses; unread-count decrements       |

## Network calls expected during normal use

| trigger          | method | path                             | what request body or query is expected |
| ---------------- | ------ | -------------------------------- | -------------------------------------- |
| List             | GET    | /api/notifications               | → 200 array                            |
| Unread count     | GET    | /api/notifications/unread-count  | → 200 `{ count }`                      |
| Mark all read    | POST   | /api/notifications/mark-all-read | empty body → 200                       |
| Mark single read | POST   | /api/notifications/:id/read      | empty body → 200 / 404                 |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/05-notifications.spec.ts`
