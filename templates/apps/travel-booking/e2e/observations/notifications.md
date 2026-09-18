# Page observations: /notifications (Notifications)

Source: live walk via Playwright on the running smoke app.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                                       | role    | expected behavior on interaction                          | success signal                   | failure signal                              |
| ---------------------------------------------------------------- | ------- | --------------------------------------------------------- | -------------------------------- | ------------------------------------------- |
| `getByRole('heading', { name: /^Notifications$/i })`             | heading | notifications page renders + GET /api/notifications fires | heading visible + GET in network | heading missing or 4xx                      |
| `getByText(/Activity/i)`                                         | text    | eyebrow visible                                           | text visible                     | text missing                                |
| `locator('[data-testid="notifications-filter-all"]')`            | button  | All filter pill is selected by default                    | button visible                   | button missing                              |
| `locator('[data-testid="notifications-filter-booking_update"]')` | button  | switches feed to bookings filter                          | active state changes             | does not change                             |
| `locator('[data-testid="notifications-filter-host_message"]')`   | button  | switches feed to host-message filter                      | active state changes             | does not change                             |
| `getByText(/all caught up                                        | new     | ago/i).first()`                                           | text                             | either empty-state OR a feed row is visible | one of the two visible | spinner persists |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | —             | —                                            |

## Network calls expected during normal use

| trigger          | method | path                          | what request body or query is expected             |
| ---------------- | ------ | ----------------------------- | -------------------------------------------------- |
| navigate         | GET    | `/api/notifications`          | 200 with array of notification rows (may be empty) |
| Mark all read    | POST   | `/api/notifications/read-all` | empty body — 200 OK                                |
| click unread row | POST   | `/api/notifications/:id/read` | empty body — 200 OK                                |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/notifications.spec.ts`
