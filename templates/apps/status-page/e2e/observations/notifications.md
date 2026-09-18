# Page observations: /notifications (Operator notifications)

> Filled from a live walk via Playwright MCP at /notifications. Re-walk
> if any visible element changes; do not edit from imagination.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name | role   | expected behavior on interaction    | success signal                | failure signal     |
| -------------------------- | ------ | ----------------------------------- | ----------------------------- | ------------------ |
| Notifications list         | list   | render rows from /api/notifications | rows visible (or empty state) | error state        |
| Empty state                | text   | shows "no notifications" when zero  | empty state visible           | shown despite rows |
| Mark all read              | button | POST /api/notifications/read-all    | all rows flip to read in DB   | rows still unread  |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | —             | —                                            |

## Network calls expected during normal use

| trigger       | method | path                        | what request body or query is expected |
| ------------- | ------ | --------------------------- | -------------------------------------- |
| Page load     | GET    | /api/notifications          | array of notifications                 |
| Mark all read | POST   | /api/notifications/read-all | `{}` flips read_at on all unread rows  |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/09-notifications.spec.ts`
