# Page observations: /reset-password (ResetPassword)

> Captured anonymously — token comes via `?token=...` query string set by the email link.

## Page state assumed

- [x] Public (no auth required, but expects `?token=...` from the reset email)

## Elements

| selector / accessible name                                 | role     | expected behavior on interaction                                                        | success signal        | failure signal                        |
| ---------------------------------------------------------- | -------- | --------------------------------------------------------------------------------------- | --------------------- | ------------------------------------- |
| `getByRole('link', { name: 'Snagr' })`                     | link     | nav to /                                                                                | URL becomes `/`       | stays on `/reset-password`            |
| `getByLabel('New password')`                               | textbox  | accepts the new password (masked)                                                       | typed value reflected | read-only                             |
| `getByLabel('Confirm new password')`                       | textbox  | accepts the password confirmation                                                       | typed value reflected | read-only                             |
| `getByRole('checkbox', { name: 'Show password' }).first()` | checkbox | toggles password visibility                                                             | input type flips      | password stays masked                 |
| `getByRole('button', { name: /reset password/i })`         | button   | POSTs /api/reset_password with `{ token, password }` and on success redirects to /login | URL becomes `/login`  | stays on `/reset-password` with error |
| `getByRole('link', { name: /back to sign in/i })`          | link     | nav to /login                                                                           | URL becomes `/login`  | stays on `/reset-password`            |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside |
| ------- | ------------- | --------------- |
| (none)  | —             | —               |

## Network calls expected during normal use

| trigger                           | method            | path                | expected body           |
| --------------------------------- | ----------------- | ------------------- | ----------------------- |
| Submit with mismatching passwords | (no network call) | —                   | inline validation error |
| Submit with matching passwords    | POST              | /api/reset_password | `{ token, password }`   |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/reset-password.spec.ts`
