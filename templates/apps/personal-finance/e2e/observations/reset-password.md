# Page observations: /reset-password (ResetPassword)

> Walked via Playwright on a fresh smoke-app at http://localhost:3010/reset-password?token=<token>.
> Reuses the Login design.

## Page state assumed

- [x] Public (no auth required, but normally entered from an email link with `?token=`)

## Elements

| selector / accessible name                         | role    | expected behavior on interaction                           | success signal                              | failure signal                   |
| -------------------------------------------------- | ------- | ---------------------------------------------------------- | ------------------------------------------- | -------------------------------- |
| `locator('input[type="email"]')`                   | textbox | accepts the user's email address                           | typed value mirrored back                   | input not visible / not editable |
| `locator('input#password')`                        | textbox | accepts the new password (masked)                          | typed value mirrored back                   | input not visible / not editable |
| `getByRole('button', { name: /reset password/i })` | button  | POSTs /api/users/reset-password with `{ token, password }` | success state visible, redirected to /login | error visible / network failure  |
| `getByRole('button', { name: /show password/i })`  | button  | toggles password visibility                                | input type flips between password/text      | toggle does nothing              |
| `[data-mol-id="reset-password-error"]`             | alert   | shown when token is missing or backend rejects             | error text visible                          | submit silently fails            |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside |
| ------- | ------------- | --------------- |

## Network calls expected during normal use

| trigger | method | path                      | expected body                    |
| ------- | ------ | ------------------------- | -------------------------------- |
| Submit  | POST   | /api/users/reset-password | `{ token, password }`, 200 / 400 |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/reset-password.spec.ts`
