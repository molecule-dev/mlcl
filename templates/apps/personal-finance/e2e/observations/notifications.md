# Page observations: /notifications (Notifications)

> Walked via Playwright on a fresh smoke-app at http://localhost:3010/notifications.
> Headings observed: 1: Notifications.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                         | role     | expected behavior on interaction                                                             | success signal                                   | failure signal                       |
| -------------------------------------------------- | -------- | -------------------------------------------------------------------------------------------- | ------------------------------------------------ | ------------------------------------ |
| `getByRole('heading', { name: /notifications/i })` | heading  | renders the page title                                                                       | heading visible                                  | nothing rendered / 401               |
| `[data-mol-id="notifications-empty"]`              | text     | empty-state message for users with no derived alerts                                         | "all caught up" text visible for empty user      | shown even when alerts exist         |
| `[data-mol-id="notifications-list"]`               | list     | renders one row per derived notification                                                     | list visible after seeding triggering data       | list missing despite seeded triggers |
| `[data-mol-id^="notification-"]` items             | listitem | rows show title, body, severity badge and timestamp                                          | seeded budget overshoot / goal milestone visible | wrong row shape                      |
| `[data-mol-id^="notification-link-"]`              | link     | "View details" deep-links to the related screen (/budgets, /goals, /accounts, /transactions) | URL changes to the linked screen                 | no navigation                        |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside |
| ------- | ------------- | --------------- |

## Network calls expected during normal use

| trigger   | method | path               | expected body                                               |
| --------- | ------ | ------------------ | ----------------------------------------------------------- |
| Page load | GET    | /api/notifications | response 200, `{ data: NotificationItem[], count: number }` |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/notifications.spec.ts`
