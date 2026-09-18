# Page observations: /notifications (Notifications)

> Filled from a live walk via Playwright MCP at /notifications (after sign-up).

## Page state assumed

- [x] Authenticated (AuthGuard route)

## Elements

| selector / accessible name                           | role      | expected behavior on interaction                                                 | success signal                | failure signal                  |
| ---------------------------------------------------- | --------- | -------------------------------------------------------------------------------- | ----------------------------- | ------------------------------- |
| `getByRole('heading', { name: /notifications/i })`   | heading   | static heading                                                                   | rendered                      | missing                         |
| `[data-mol-id=notifications-empty]` empty-state copy | paragraph | shown when the user has no @-mentions                                            | text "You're all caught up."  | missing on empty state          |
| `[data-mol-id=notifications-list]` mention list      | list      | shown when mentions exist; each row is a mention card with sender name + content | populated mention rows render | list missing on populated state |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | —             | —                                            |

## Network calls expected during normal use

| trigger   | method | path          | what request body or query is expected                            |
| --------- | ------ | ------------- | ----------------------------------------------------------------- |
| Page load | GET    | /api/messages | returns all visible messages; client filters for @<user> mentions |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/notifications.spec.ts`
