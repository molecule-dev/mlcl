# Page observations: /notifications (Notifications)

> Authenticated — operator notifications inbox. Heading
> "Notifications", an empty-state when nothing exists, a list of
> notification rows with title/body/timestamp, per-row "Mark read"
> action, and a "Mark all read" header action.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                                            | role         | expected behavior on interaction                                          | success signal                                 | failure signal                       |
| --------------------------------------------------------------------- | ------------ | ------------------------------------------------------------------------- | ---------------------------------------------- | ------------------------------------ |
| `getByRole('heading', { name: /notifications/i })` + empty-state copy | heading/text | renders heading + empty state when GET /api/notifications returns `[]`    | both visible on a fresh account                | heading missing / empty state absent |
| created notification row                                              | text         | a POST /api/notifications row appears in the list with its title/body     | the new title is visible after refresh         | row missing after creation           |
| "Mark read" per-row                                                   | button       | PUT /api/notifications/:id/read flips `read_at` to a non-null timestamp   | row flips to read state and reload reflects it | `read_at` stays null after click     |
| "Mark all read" header action                                         | button       | POST /api/notifications/mark-all-read clears every unread row in one shot | unread count drops to 0 after reload           | rows remain unread                   |

## Hidden surfaces opened from this page

| trigger         | what it opens | elements inside |
| --------------- | ------------- | --------------- |
| (none observed) | n/a           | n/a             |

## Network calls expected during normal use

| trigger | method | path | what request body or query is expected |
| ------- | ------ | ---- | -------------------------------------- |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/19-notifications.spec.ts`
