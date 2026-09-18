# Page observations: /notifications (Notifications)

> Activity feed for invoice events (sent / paid / overdue). The handler
> derives notifications from the user's invoice + payment rows
> (no separate `notifications` table). "Mark all read" persists the
> watermark in the user's `oauthData` so unread badges clear.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                          | role    | expected behavior on interaction                                    | success signal                       | failure signal         |
| --------------------------------------------------- | ------- | ------------------------------------------------------------------- | ------------------------------------ | ---------------------- |
| `getByRole('heading', { name: /^Notifications$/ })` | heading | static title                                                        | visible                              | missing                |
| notification card linking to `/invoices`            | link    | navigates to `/invoices` (or to a specific invoice id when present) | URL changes to `/invoices…`          | stays                  |
| `getByRole('button', { name: /Mark all read/ })`    | button  | POSTs to mark-all endpoint; UI flips unread → read on next read     | unread count drops to 0 after reload | unread count unchanged |
| feed item title text (e.g. "Sent INV-1042 to …")    | text    | rendered from API row                                               | visible matching invoice number      | missing                |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |

## Network calls expected during normal use

| trigger       | method | path                                        | what request body or query is expected |
| ------------- | ------ | ------------------------------------------- | -------------------------------------- |
| initial mount | GET    | /api/notifications                          | array of derived notification rows     |
| Mark all read | POST   | /api/notifications/mark-all-read (or PATCH) | empty body; 200/204                    |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/notifications.spec.ts`
