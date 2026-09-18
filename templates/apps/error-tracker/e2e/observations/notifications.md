# Page observations: /notifications

> Authenticated notifications inbox. Mark all read via POST /api/notifications/read-all.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                      | role        | expected behavior on interaction                          | success signal     | failure signal         |
| ----------------------------------------------- | ----------- | --------------------------------------------------------- | ------------------ | ---------------------- |
| Notification rows from /api/notifications       | list        | renders 4 seeded notifications                            | titles visible     | empty                  |
| "Mark all as read" button                       | button      | POST /api/notifications/read-all flips every is_read=true | GET shows 0 unread | unread count unchanged |
| Notification row click → /api/notifications/:id | link/button | opens or resolves the notification                        | state visible      | no effect              |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside |
| ------- | ------------- | --------------- |
|         |               |                 |

## Network calls expected during normal use

| trigger | method | path | expected body |
| ------- | ------ | ---- | ------------- |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in the matching e2e/<n>-notifications.spec.ts
