# Page observations: /reset-password (ResetPassword)

> Filled from a live walk via Playwright. Re-walk if any visible element
> changes; do not edit from imagination.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                  | role    | expected behavior on interaction                                        | success signal                        | failure signal                     |
| ------------------------------------------- | ------- | ----------------------------------------------------------------------- | ------------------------------------- | ---------------------------------- |
| `input[type=email]` (Email)                 | textbox | accept email value (prefilled from `?email=`)                           | typed value reflected                 | input rejects                      |
| `input[type=text]` (Reset token)            | textbox | accept token (prefilled from `?token=`)                                 | typed value reflected                 | input rejects                      |
| `input[type=password]` (New password)       | textbox | accept new password                                                     | typed value reflected, masked display | input rejects                      |
| `input[type=password]` (Confirm password)   | textbox | accept confirmation                                                     | typed value reflected, masked display | input rejects                      |
| `form button[type=submit]` (Reset password) | button  | POST `/api/users/reset-password`; on success log in + redirect to /feed | URL becomes /feed                     | error and stays on /reset-password |
| `a[href="/login"]` (Back to sign in)        | link    | navigate to /login                                                      | URL becomes /login                    | nav fails                          |

## Hidden surfaces opened from this page

| trigger              | what it opens               | elements inside (selector / role / behavior) |
| -------------------- | --------------------------- | -------------------------------------------- |
| Mismatched passwords | inline alert (`role=alert`) | "Passwords do not match." copy               |

## Network calls expected during normal use

| trigger                        | method | path                      | what request body or query is expected                |
| ------------------------------ | ------ | ------------------------- | ----------------------------------------------------- |
| Reset password (matching pws)  | POST   | /api/users/reset-password | `{ token, password }` returns success or 4xx          |
| Reset password (after success) | POST   | /api/users/log-in         | `{ email, password }` returns `{ accessToken, user }` |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/reset-password.spec.ts`
