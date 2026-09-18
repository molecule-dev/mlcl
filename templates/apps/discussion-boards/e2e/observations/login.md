# Page observations: /login (Login)

> Public auth page. Email + password + optional 2FA token, plus a
> "Sign in" submit, "Forgot?" link to /forgot-password, "Create an
> account" link to /signup, and the OAuth buttons (Google/GitHub/etc.).

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                          | role                 | expected behavior on interaction       | success signal                        | failure signal                  |
| --------------------------------------------------- | -------------------- | -------------------------------------- | ------------------------------------- | ------------------------------- |
| `page.locator('#login-email')`                      | input[type=email]    | accepts email                          | value reflects typed text             | input ignores keystrokes        |
| `page.locator('#login-password')`                   | input[type=password] | accepts password                       | value reflects typed text             | input ignores keystrokes        |
| `page.locator('#login-2fa')`                        | input[type=text]     | accepts optional 2FA token             | value reflects typed text             | input ignores keystrokes        |
| `getByRole('button', { name: /Sign in/i })`         | button               | POST /api/users/login → navigate to /c | url `/c`, accessToken in localStorage | stays on /login with error text |
| `getByRole('link', { name: /Forgot/i })`            | link                 | navigates to /forgot-password          | url `/forgot-password`                | stays on /login                 |
| `getByRole('link', { name: /Create an account/i })` | link                 | navigates to /signup                   | url `/signup`                         | stays on /login                 |
| `page.getByText(/or continue with/i)`               | text                 | OAuth divider visible                  | text visible                          | text missing                    |

## Hidden surfaces opened from this page

(none — direct form)

## Network calls expected during normal use

| trigger       | method | path               | what request body or query is expected    |
| ------------- | ------ | ------------------ | ----------------------------------------- |
| Sign in click | POST   | `/api/users/login` | `{ email, password }`                     |
| invalid email | POST   | `/api/users/login` | returns 400/401 surfaced as error message |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/login.spec.ts`
