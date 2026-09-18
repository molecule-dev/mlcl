# Page observations: /reset-password (ResetPassword)

> Captured anonymously — driven by a `?token=...` query string from the
> reset-link email; submits the new password to /api/users/reset-password.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                       | role                   | expected behavior on interaction           | success signal                                       | failure signal                  |
| ------------------------------------------------ | ---------------------- | ------------------------------------------ | ---------------------------------------------------- | ------------------------------- |
| `page.locator('input[type="password"]').first()` | textbox                | accepts the new password (masked)          | input value reflects typed text                      | input is read-only              |
| `page.locator('input[type="password"]').nth(1)`  | textbox                | accepts the password confirmation (masked) | input value reflects typed text                      | input is read-only              |
| `getByRole('button', { name: /reset password     | set new password/i })` | button                                     | POST /api/users/reset-password with token + password | success message + nav to /login | error message visible      |
| `getByRole('link', { name: /back to login        | sign in/i })`          | link                                       | nav to /login                                        | URL becomes `/login`            | stays on `/reset-password` |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside |
| ------- | ------------- | --------------- |
| (none)  | —             | —               |

## Network calls expected during normal use

| trigger     | method | path                      | expected body         |
| ----------- | ------ | ------------------------- | --------------------- |
| Submit form | POST   | /api/users/reset-password | `{ token, password }` |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/05-reset-password.spec.ts`
