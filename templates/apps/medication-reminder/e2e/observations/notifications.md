# Page observations: /notifications (Notifications)

> Filled by the dispatch-flagship agent driving the running app via Playwright MCP.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name | role     | expected behavior on interaction                                               | success signal                         | failure signal             |
| -------------------------- | -------- | ------------------------------------------------------------------------------ | -------------------------------------- | -------------------------- |
| Notifications heading      | heading  | renders "Notifications"                                                        | visible                                | absent                     |
| Empty placeholder          | text     | shown for fresh user (zero notifications)                                      | "No notifications yet" copy visible    | rendered list with no rows |
| Notification feed item     | listitem | one row per `GET /api/notifications` row, icon mapped from `kind`              | seeded notification row visible        | not rendered               |
| Mark all read button       | button   | POSTs /api/notifications/:id/read for every unread id; UI clears unread accent | button hides; unread items become read | unread state persists      |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | (none)        | (none)                                       |

## Network calls expected during normal use

| trigger       | method | path                        | what request body or query is expected |
| ------------- | ------ | --------------------------- | -------------------------------------- |
| Page mount    | GET    | /api/notifications          | (none) — owner-scoped feed             |
| Mark all read | POST   | /api/notifications/:id/read | (one per unread id)                    |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/notifications.spec.ts`
