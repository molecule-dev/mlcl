# Page observations: /notifications (Notifications)

Notifications inbox. Asserts list, mark-all-read, and dismiss flows.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                  | role           | expected behavior on interaction                                | success signal                                                           | failure signal                                             |
| ------------------------------------------- | -------------- | --------------------------------------------------------------- | ------------------------------------------------------------------------ | ---------------------------------------------------------- |
| notifications list                          | list           | fetches /api/notifications and renders one row per notification | seeded notification visible                                              | list empty after seed                                      |
| `getByRole("button", { name: /mark all read | read all/i })` | button                                                          | PATCH each unread notification → all rows show read state on next render | unread badge clears, follow-up GET shows read=true on rows | rows still unread |
| per-row dismiss button                      | button         | DELETE /api/notifications/:id → row removed from list           | row disappears, follow-up GET excludes the id                            | row stays                                                  |

## Hidden surfaces opened from this page

| trigger            | what it opens | elements inside (selector / role / behavior) |
| ------------------ | ------------- | -------------------------------------------- |
| (none — flat page) | —             | —                                            |

## Network calls expected during normal use

| trigger       | method | path                   | what request body or query is expected |
| ------------- | ------ | ---------------------- | -------------------------------------- |
| initial load  | GET    | /api/notifications     | 200 with notifications array           |
| mark all read | PATCH  | /api/notifications/:id | { read: true } per id → 200            |
| dismiss       | DELETE | /api/notifications/:id | empty body → 204/200                   |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in the matching spec file
