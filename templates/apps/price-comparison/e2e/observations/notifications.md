# Page observations: /notifications (Notifications)

> Filled by the dispatch-flagship agent driving the running app via Playwright.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                                | role      | expected behavior on interaction      | success signal            | failure signal |
| --------------------------------------------------------- | --------- | ------------------------------------- | ------------------------- | -------------- |
| `[data-test=notifications-page]` shell                    | container | page wrapper                          | rendered                  | empty          |
| `[data-test=notifications-feed]` feed                     | list      | one row per /api/notifications row    | ≥1 row after seed         | empty          |
| `[data-test=notifications-mark-read]` "Mark all read" btn | button    | POST /api/notifications/mark-all-read | unread count → 0          | unchanged      |
| `[data-test=notifications-filter-drop]` Drops filter      | button    | filters to drop kind                  | only "drop" rows visible  | unchanged      |
| `[data-test=notifications-filter-alert]` Alerts filter    | button    | filters to alert kind                 | only "alert" rows visible | unchanged      |
| `[data-test=notifications-filter-all]` All filter         | button    | shows all rows                        | all rows visible          | filter ignored |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | (none)        | (none)                                       |

## Network calls expected during normal use

| trigger       | method | path                             | what request body or query is expected |
| ------------- | ------ | -------------------------------- | -------------------------------------- |
| page load     | GET    | /api/notifications               | limit=50                               |
| mark all read | POST   | /api/notifications/mark-all-read | empty body                             |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/notifications.spec.ts`
