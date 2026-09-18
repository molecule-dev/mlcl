# Page observations: /notifications (Notifications)

> Filled by AI agent driving the running app on http://localhost:3020 with
> a just-signed-up user.

## Page state assumed

- (n/a) Public (no auth required), OR
- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                          | role     | expected behavior on interaction                                  | success signal                                                                               | failure signal                  |
| --------------------------------------------------- | -------- | ----------------------------------------------------------------- | -------------------------------------------------------------------------------------------- | ------------------------------- |
| `getByText(/Inbox zero feels good/i)` (empty state) | text     | shown when there are no notifications                             | visible after load                                                                           | message hidden when inbox empty |
| `getByTestId("notifications-mark-all-read")`        | button   | POSTs /api/notifications/read-all; refreshes list                 | unread count → 0; button stays visible (disabled when 0 unread)                              | request never fires / 4xx       |
| `getByTestId("notifications-filter-all")`           | button   | switches filter to All; shows every item                          | active styling applied                                                                       | filter never switches           |
| `getByTestId("notifications-filter-unread")`        | button   | switches filter to Unread; hides read items                       | active styling + only unread items                                                           | filter never switches           |
| `getByTestId(/^notification-/)` (per-item row)      | listitem | clicking marks the item read via POST /api/notifications/:id/read | item style changes (no longer bg-primary/5) + GET /api/notifications shows read_at timestamp | nothing happens                 |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |

## Network calls expected during normal use

| trigger             | method | path                        | what request body or query is expected |
| ------------------- | ------ | --------------------------- | -------------------------------------- |
| load /notifications | GET    | /api/notifications          | response: array of notification rows   |
| click mark-all-read | POST   | /api/notifications/read-all | empty body; response 200               |
| click an item       | POST   | /api/notifications/:id/read | empty body; response 200               |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in the matching spec file
