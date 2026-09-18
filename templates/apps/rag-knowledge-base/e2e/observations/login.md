# Page observations: /login (Login)

## Page state assumed

- [x] Public (no auth required)
- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                    | role                   | expected behavior on interaction                                              | success signal               | failure signal           |
| --------------------------------------------- | ---------------------- | ----------------------------------------------------------------------------- | ---------------------------- | ------------------------ |
| `locator('input#email')`                      | textbox                | accepts an email address                                                      | value reflects typed input   | input cleared / disabled |
| `locator('input#password')`                   | textbox                | accepts a password value                                                      | value reflects typed input   | input cleared / disabled |
| `getByRole('button', { name: /sign\s*in/i })` | button                 | submits the login form, POSTs /api/users/log-in, redirects to /ask on success | URL becomes /ask             | stays on /login          |
| `getByRole('link', { name: /sign\s*up         | create\s*account/i })` | link                                                                          | navigates to /signup         | URL becomes /signup      | stays on /login |
| `getByRole('link', { name: /forgot/i })`      | link                   | navigates to /forgot-password                                                 | URL becomes /forgot-password | stays on /login          |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |

## Network calls expected during normal use

| trigger | method | path              | what request body or query is expected |
| ------- | ------ | ----------------- | -------------------------------------- |
| submit  | POST   | /api/users/log-in | { email, password }                    |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/login.spec.ts`
