# Page observations: /notifications (Notifications)

## Page state assumed

- [x] Public (no auth required)
- [x] Authenticated (sign up first via `signup(page)`); seed at least
      one notification via direct API call (`createNotification`).

## Elements

| selector / accessible name                                                    | role      | expected behavior on interaction           | success signal                | failure signal  |
| ----------------------------------------------------------------------------- | --------- | ------------------------------------------ | ----------------------------- | --------------- |
| `getByRole('heading', { level: 1 })`                                          | heading   | renders "Notifications" h1                 | h1 visible                    | h1 missing      |
| `[data-testid="notifications-list"]` or `[data-testid="notifications-empty"]` | list/text | renders the list OR empty state            | one is visible                | neither visible |
| `[data-testid^="notifications-row-"]` (any)                                   | listitem  | renders a row per notification once seeded | row count > 0 with data       | rows missing    |
| `[data-testid^="notifications-mark-read-"]` (any)                             | button    | PUT /api/notifications/:id with read_at    | row's data-unread becomes "0" | error visible   |
| `[data-testid^="notifications-dismiss-"]` (any)                               | button    | DELETE /api/notifications/:id              | row removed from list         | error visible   |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |

## Network calls expected during normal use

| trigger   | method | path                   | what request body or query is expected |
| --------- | ------ | ---------------------- | -------------------------------------- |
| mount     | GET    | /api/notifications     | scoped to current user                 |
| mark-read | PUT    | /api/notifications/:id | { read_at }                            |
| dismiss   | DELETE | /api/notifications/:id | none                                   |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/notifications.spec.ts`
