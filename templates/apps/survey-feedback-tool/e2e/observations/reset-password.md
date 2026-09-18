# Page observations: /reset-password (ResetPassword)

## Page state assumed

- [x] Public (no auth required); requires a `?token=` query string from the email

## Elements

| selector / accessible name                                    | role    | expected behavior on interaction                  | success signal           | failure signal         |
| ------------------------------------------------------------- | ------- | ------------------------------------------------- | ------------------------ | ---------------------- |
| `input[autocomplete="new-password"]` ("New password")         | textbox | accepts the new password (≥8 chars)               | typed value reflected    | <8 chars blocks submit |
| `input[autocomplete="new-password"]` ("Confirm new password") | textbox | accepts confirmation password                     | typed value reflected    | mismatch blocks submit |
| `getByRole('button', { name: 'Reset password' })`             | button  | submits POST /api/users/reset-password with token | success state + redirect | error alert visible    |
| `getByRole('link', { name: 'Sign in' })`                      | link    | navigates to /login                               | URL becomes /login       | nothing happens        |
| `getByRole('link', { name: 'Murmur' })`                       | link    | navigates to landing /                            | URL becomes /            | nothing happens        |

## Hidden surfaces opened from this page

| trigger        | what it opens             | elements inside (selector / role / behavior) |
| -------------- | ------------------------- | -------------------------------------------- |
| Submit success | inline confirmation panel | "Password updated" message + sign-in link    |

## Network calls expected during normal use

| trigger           | method | path                      | what request body or query is expected |
| ----------------- | ------ | ------------------------- | -------------------------------------- |
| Submit reset form | POST   | /api/users/reset-password | { token, password }                    |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/reset-password.spec.ts`
