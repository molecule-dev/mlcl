# Page observations: /notifications (Notifications)

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name          | role    | expected behavior on interaction      | success signal      | failure signal |
| ----------------------------------- | ------- | ------------------------------------- | ------------------- | -------------- |
| `getByRole('heading')` first        | heading | "Notifications" rendered              | rendered            | missing        |
| `[data-mol-id="cta-mark-all-read"]` | button  | POST /api/notifications/mark-all-read | unread badge clears | error toast    |
| `[data-mol-id^="mark-read-"]`       | button  | POST /api/notifications/:id/read      | item marked read    | error toast    |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |

## Network calls expected during normal use

| trigger           | method | path                             | what request body or query is expected |
| ----------------- | ------ | -------------------------------- | -------------------------------------- |
| mount             | GET    | /api/notifications               | list of user notifications             |
| cta-mark-all-read | POST   | /api/notifications/mark-all-read | mark all read                          |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/notifications.spec.ts`
