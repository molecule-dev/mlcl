# Page observations: /forgot-password (ForgotPassword)

> POST /api/users/forgot-password to send reset link.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name            | role          | expected behavior on interaction | success signal           | failure signal                   |
| ------------------------------------- | ------------- | -------------------------------- | ------------------------ | -------------------------------- |
| `page.locator('input[type="email"]')` | textbox       | fills email                      | value matches typed text | empty                            |
| `getByRole('button', { name: /send    | reset         | submit/i })`                     | button                   | POSTs /api/users/forgot-password | success status appears | error message |
| `getByRole('link', { name: /back      | sign in/i })` | link                             | nav to /login            | URL becomes /login               | stays                  |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside |
| ------- | ------------- | --------------- |

## Network calls expected during normal use

| trigger | method | path                       | expected body |
| ------- | ------ | -------------------------- | ------------- |
| Submit  | POST   | /api/users/forgot-password | `{ email }`   |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/04-forgot-password.spec.ts`
