# Page observations: /reset-password (ResetPassword)

> Public token-based reset. Email + token (prefilled from URL) +
> new password + confirm. Submit posts the reset, then auto-logs in
> with the new credentials and navigates to /c.

## Page state assumed

- [x] Public (no auth required) — accessed via emailed link with `?token=…`

## Elements

| selector / accessible name                         | role                 | expected behavior on interaction          | success signal                         | failure signal           |
| -------------------------------------------------- | -------------------- | ----------------------------------------- | -------------------------------------- | ------------------------ |
| `page.locator('#reset-email')`                     | input[type=email]    | accepts email (prefilled if `?email=`)    | value reflects URL param or typed text | input ignores keystrokes |
| `page.locator('#reset-token')`                     | input[type=text]     | accepts token (prefilled if `?token=`)    | value reflects URL param or typed text | input ignores keystrokes |
| `page.locator('#reset-password')`                  | input[type=password] | accepts new password (min 8)              | value reflects typed text              | accepts <8 chars         |
| `page.locator('#reset-confirm')`                   | input[type=password] | accepts confirm new password              | value reflects typed text              | input ignores keystrokes |
| `getByRole('button', { name: /Reset password/i })` | button               | POST forgot-password/confirm → login → /c | url `/c` after success                 | stays on /reset-password |
| `getByRole('link', { name: /Back to sign in/i })`  | link                 | navigates to /login                       | url `/login`                           | stays on /reset-password |
| password mismatch                                  | n/a                  | shows mismatch error                      | red text "Passwords do not match"      | no error shown           |

## Network calls expected during normal use

| trigger                | method | path                        | what request body or query is expected    |
| ---------------------- | ------ | --------------------------- | ----------------------------------------- |
| reset submit           | POST   | `/api/users/reset-password` | `{ token, password }` returns 200         |
| auto-login after reset | POST   | `/api/users/log-in`         | `{ email, password }` returns accessToken |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/reset-password.spec.ts`
