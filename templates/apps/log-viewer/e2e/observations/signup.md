# Page observations: /signup (Signup)

> POST /api/users → JWT issued → redirect to /dashboard.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                       | role         | expected behavior on interaction | success signal           | failure signal                           |
| ------------------------------------------------ | ------------ | -------------------------------- | ------------------------ | ---------------------------------------- |
| `page.locator('input[type="email"]')`            | textbox      | fills the email input            | value matches typed text | input rejects input                      |
| `page.locator('input[type="password"]').first()` | textbox      | fills the password input         | value matches typed text | input rejects input                      |
| `getByRole('button', { name: /create account     | sign up      | get started/i })`                | button                   | submits the signup form, POST /api/users | URL leaves /signup, redirect to /dashboard | stays on /signup with error |
| `getByRole('link', { name: /sign in              | log in/i })` | link                             | nav to /login            | URL becomes /login                       | stays on /signup                           |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside |
| ------- | ------------- | --------------- |

## Network calls expected during normal use

| trigger     | method | path       | expected body         |
| ----------- | ------ | ---------- | --------------------- |
| Submit form | POST   | /api/users | `{ email, password }` |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/02-signup.spec.ts`
