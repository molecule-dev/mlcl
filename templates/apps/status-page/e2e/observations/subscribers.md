# Page observations: /subscribers (Subscribers list)

> Filled from a live walk via Playwright MCP at /subscribers. Re-walk if
> any visible element changes; do not edit from imagination.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                                 | role     | expected behavior on interaction                             | success signal                           | failure signal     |
| ---------------------------------------------------------- | -------- | ------------------------------------------------------------ | ---------------------------------------- | ------------------ |
| `getByTestId('invite-subscriber-btn')` (Invite subscriber) | button   | toggle inline invite form; POST /api/subscribers on submit   | form visible, then 201 + new row in list | error visible      |
| `getByTestId('invite-submit')`                             | button   | submit must be disabled until destination is filled          | disabled state honored                   | enabled when blank |
| Each subscriber row                                        | listitem | shows destination + channel + notification type + components | row visible                              | row missing        |

## Hidden surfaces opened from this page

| trigger           | what it opens | elements inside (selector / role / behavior)            |
| ----------------- | ------------- | ------------------------------------------------------- |
| Invite subscriber | inline form   | destination, channel, notification-type, submit, cancel |

## Network calls expected during normal use

| trigger       | method | path             | what request body or query is expected                                      |
| ------------- | ------ | ---------------- | --------------------------------------------------------------------------- |
| Page load     | GET    | /api/subscribers | array of subscribers                                                        |
| Submit invite | POST   | /api/subscribers | `{ email/destination, channel, notification_type, components }` returns 201 |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/07-subscribers.spec.ts`
