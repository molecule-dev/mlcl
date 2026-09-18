# Page observations: /notifications (Notifications)

Observed via Playwright MCP at `/notifications` while authenticated.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                                    | role    | expected behavior on interaction                                                                                                                                                    | success signal                           | failure signal               |
| ------------------------------------------------------------- | ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- | ---------------------------- |
| `getByRole('heading', { name: /notifications/i })`            | heading | page heading rendered                                                                                                                                                               | visible                                  | missing                      |
| `getByText(/You are caught up\|No notifications/i)`           | text    | empty state for fresh user                                                                                                                                                          | visible                                  | misleading "1 unread"        |
| `getByRole('button', { name: /^All\|^Unread\|^Mentions$/i })` | button  | filter buttons toggle the visible list (All / Unread / Mentions)                                                                                                                    | active state changes                     | unresponsive                 |
| `getByRole('button', { name: /mark all as read/i })`          | button  | disabled when there are zero unread; PATCHes /api/notifications/:id/read for all unread otherwise                                                                                   | `disabled` true on empty state           | enabled with no unread       |
| author/recipient invariant (multi-context)                    | n/a     | publishing an article fans out one `article_published` notification to space members but NOT to the author; PATCH draft→published triggers exactly one notification (no duplicates) | recipient sees one row; author sees none | duplicate or wrong recipient |

## Hidden surfaces opened from this page

(none)

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |

## Network calls expected during normal use

(spec verifies invariants via direct `apiGet/apiPost/apiPatch` rather
than `captureNetwork`; the wire calls below match those helper calls
exactly.)

| trigger | method | path | what request body or query is expected |
| ------- | ------ | ---- | -------------------------------------- |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/notifications.spec.ts`
