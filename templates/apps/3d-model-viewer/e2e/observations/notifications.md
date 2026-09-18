# Page observations: /notifications (Notifications)

> Filled by the dispatch-flagship agent driving the running app via Playwright MCP.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name | role    | expected behavior on interaction                                     | success signal                                | failure signal    |
| -------------------------- | ------- | -------------------------------------------------------------------- | --------------------------------------------- | ----------------- |
| Notifications heading      | heading | render Notifications h1                                              | visible                                       | absent            |
| Mark-all-read API call     | network | POST /api/notifications/mark-all-read flips unread→read for all rows | subsequent GET returns unread=false           | unread still true |
| Single notification PUT    | network | PUT /api/notifications/:id { unread: false } updates a row           | subsequent GET shows unread=false for that id | unread still true |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | (none)        | (none)                                       |

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
- [x] All elements above have a corresponding test in `e2e/notifications.spec.ts`
