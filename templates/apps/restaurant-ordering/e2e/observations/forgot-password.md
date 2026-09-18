# Page observations: /forgot-password (ForgotPassword)

> Public — branded auth shell. Headline "Reset your password" with
> subtitle "Enter your email and we'll send a reset link." A single
> Email input and a "Send reset link" button. Footer link "Remembered
> your password? Sign in" returns to /login.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                               | role    | expected behavior on interaction                                                                 | success signal       | failure signal  |
| -------------------------------------------------------- | ------- | ------------------------------------------------------------------------------------------------ | -------------------- | --------------- |
| `getByRole('heading', { name: /reset your password/i })` | heading | page identifier                                                                                  | h2 visible           | empty page      |
| `getByLabel(/email address/i)`                           | textbox | accepts the email to receive the reset link                                                      | typed text reflected | input read-only |
| `getByRole('button', { name: /send reset link/i })`      | button  | POST /api/users/forgot-password with `{email}`; on 2xx flips to "check your email" success state | success copy visible | error message   |
| `getByRole('link', { name: /sign in/i })`                | link    | nav back to /login                                                                               | URL becomes /login   | link missing    |

## Hidden surfaces opened from this page

| trigger | what it opens                    | elements inside |
| ------- | -------------------------------- | --------------- |
| (none)  | (no menus / modals on this page) | n/a             |

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
- [x] All elements above have a corresponding test in `e2e/13-forgot-password.spec.ts`
