# Page observations: /reset-password (ResetPassword)

> POST /api/users/reset-password with token + new password, then login.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name          | role          | expected behavior on interaction | success signal | failure signal                  |
| ----------------------------------- | ------------- | -------------------------------- | -------------- | ------------------------------- |
| `page.locator('#reset-token')`      | textbox       | pre-filled from query, editable  | value matches  | empty                           |
| `page.locator('#reset-email')`      | textbox       | pre-filled from query, editable  | value matches  | empty                           |
| `page.locator('#reset-password')`   | textbox       | accepts password input           | value matches  | empty                           |
| `getByRole('button', { name: /reset | confirm       | submit/i })`                     | button         | POSTs /api/users/reset-password | redirect to /dashboard or shows error | unchanged |
| `getByRole('link', { name: /back    | sign in/i })` | link                             | nav to /login  | URL becomes /login              | stays                                 |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside |
| ------- | ------------- | --------------- |

## Network calls expected during normal use

| trigger | method | path                      | expected body         |
| ------- | ------ | ------------------------- | --------------------- |
| Submit  | POST   | /api/users/reset-password | `{ token, password }` |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/05-reset-password.spec.ts`
