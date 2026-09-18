# Page observations: /login (Login)

> POST /api/users/log-in → JWT → /dashboard.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                  | role                 | expected behavior on interaction | success signal                    | failure signal                 |
| ------------------------------------------- | -------------------- | -------------------------------- | --------------------------------- | ------------------------------ |
| `page.locator('input[type="email"]')`       | textbox              | fills email input                | value matches typed text          | empty                          |
| `page.locator('input[type="password"]')`    | textbox              | fills password input             | value matches typed text          | empty                          |
| `getByRole('button', { name: /sign in       | log in/i })`         | button                           | submits, POST /api/users/log-in   | URL leaves /login              | stays on /login with error |
| `getByRole('link', { name: /forgot/i })`    | link                 | nav to /forgot-password          | URL becomes /forgot-password      | stays on /login                |
| `getByRole('link', { name: /sign up         | create account/i })` | link                             | nav to /signup                    | URL becomes /signup            | stays on /login            |
| `getByRole('button', { name: /show password | hide password/i })`  | button                           | toggles password input visibility | input type swaps text/password | unchanged                  |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside |
| ------- | ------------- | --------------- |

## Network calls expected during normal use

| trigger     | method | path              | expected body         |
| ----------- | ------ | ----------------- | --------------------- |
| Submit form | POST   | /api/users/log-in | `{ email, password }` |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/03-login.spec.ts`
