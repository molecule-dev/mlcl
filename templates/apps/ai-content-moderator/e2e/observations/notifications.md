# Page observations: /notifications (Notifications)

Source: live walk via Playwright + e2e/notifications.spec.ts.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                                                          | role         | expected behavior on interaction                              | success signal                                    | failure signal                |
| ----------------------------------------------------------------------------------- | ------------ | ------------------------------------------------------------- | ------------------------------------------------- | ----------------------------- |
| empty state                                                                         | text         | fresh account renders "No notifications" empty state          | empty-state visible after load                    | content shown when none exist |
| seeded notifications                                                                | list         | seeded rows render with title, body, and an unread badge      | seeded title + "new" badge visible                | rows missing                  |
| `getByRole('button', { name: /assignments\|escalations\|mentions\|rule alerts/i })` | button group | each filter sets `?filter=<kind>` on the URL                  | URL updates per filter                            | URL unchanged                 |
| `getByRole('button', { name: /mark all read/i })`                                   | button       | POST /api/notifications/read-all flips `read_at` on every row | next GET → all rows have non-null `read_at`       | row remains unread            |
| `getByRole('button', { name: /mark as read/i })` per row                            | button       | POST /api/notifications/:id/read flips only the targeted row  | targeted row read_at non-null, others remain null | wrong rows flipped            |

## Hidden surfaces opened from this page

| trigger                 | what it opens | elements inside (selector / role / behavior) |
| ----------------------- | ------------- | -------------------------------------------- |
| (none — flat list page) | —             | —                                            |

## Network calls expected during normal use

| trigger      | method | path                        | what request body or query is expected |
| ------------ | ------ | --------------------------- | -------------------------------------- |
| initial load | GET    | /api/notifications          | 200 with array of notification rows    |
| mark all     | POST   | /api/notifications/read-all | empty → 200                            |
| mark single  | POST   | /api/notifications/:id/read | empty → 200                            |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/notifications.spec.ts`
