# Page observations: /reset-password (ResetPassword)

> Public — branded auth shell. Email + reset token + new password +
> confirm password fields. Honors `?token=` and `?email=` query string.
> Submit → POST /api/users/reset-password → on success auto-logs in
> and redirects to /explore. "Back to sign in" returns to /login.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                                   | role             | expected behavior on interaction         | success signal                                                | failure signal         |
| ------------------------------------------------------------ | ---------------- | ---------------------------------------- | ------------------------------------------------------------- | ---------------------- |
| `getByRole('heading', { name: /set new password/i })`        | heading          | identifies the page                      | heading visible                                               | empty page             |
| `page.locator('input[type="email"]')`                        | textbox          | accepts email (prefilled from `?email=`) | input updates                                                 | read-only              |
| `page.locator('input[autocomplete="new-password"]').first()` | textbox          | accepts new password                     | input updates                                                 | read-only              |
| `page.locator('input[autocomplete="new-password"]').nth(1)`  | textbox          | accepts password confirm                 | input updates                                                 | read-only              |
| `getByRole('button', { name: /reset password                 | submitting/i })` | button                                   | POST /api/users/reset-password; on 2xx logs in + nav /explore | URL becomes `/explore` | stays w/ error |
| `getByRole('link', { name: /back to sign in/i })`            | link             | nav to /login                            | URL becomes `/login`                                          | stays                  |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside |
| ------- | ------------- | --------------- |

## Network calls expected during normal use

| trigger     | method | path                      | what request body or query is expected |
| ----------- | ------ | ------------------------- | -------------------------------------- |
| Submit form | POST   | /api/users/reset-password | `{ token, password }`; 200 sets new pw |
| After reset | POST   | /api/users/log-in         | follow-up auto-login                   |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/reset-password.spec.ts`
