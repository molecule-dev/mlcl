# Page observations: /reset-password

> Filled from real Playwright walks captured by `scripts/walk-quiz-platform.mjs`.

## Page state assumed

- [x] Public; pre-filled from `?token=` and `?email=` query params if present.

## Elements

| selector / accessible name                                                             | role           | expected behavior on interaction                                                                                                     | success signal                                | failure signal                                |
| -------------------------------------------------------------------------------------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------- | --------------------------------------------- |
| `getByRole('link', { name: /sparq home/i })`                                           | link           | navigate to /                                                                                                                        | URL = /                                       | otherwise                                     |
| `getByRole('button', { name: /toggle theme/i })`                                       | button         | flips data-theme                                                                                                                     | data-theme attr changes                       | unchanged                                     |
| `getByRole('textbox', { name: /email/i })`                                             | input email    | accept text; pre-fills from `?email=`                                                                                                | value reflects typed/query                    | missing                                       |
| `getByRole('textbox', { name: /password reset token/i })` (DOM `input[type=password]`) | input password | accept text; pre-fills from `?token=`                                                                                                | DOM value matches                             | missing                                       |
| `getByRole('textbox', { name: /enter new password/i })` (DOM `input[type=password]`)   | input password | accept text                                                                                                                          | DOM value matches                             | missing                                       |
| `getByRole('button', { name: /reset password/i })`                                     | submit         | POST /api/users/password-reset/confirm with `{ token, password }` then auto-login via POST /api/sessions, then navigate to /discover | URL = /discover, bearer present               | error text visible, URL stays /reset-password |
| Submit with bad token                                                                  | submit         | POST /api/users/password-reset/confirm returns 400/401                                                                               | error text visible, URL stays /reset-password | redirect away                                 |
| `getByRole('link', { name: /back to sign in/i })`                                      | link           | navigates to /login                                                                                                                  | URL = /login                                  | otherwise                                     |
| `getByRole('link', { name: /privacy/i })`                                              | link           | navigates to /privacy                                                                                                                | URL = /privacy                                | otherwise                                     |
| `getByRole('link', { name: /terms/i })`                                                | link           | navigates to /terms                                                                                                                  | URL = /terms                                  | otherwise                                     |
| `getByRole('button', { name: /language/i })`                                           | button         | opens language switcher                                                                                                              | popover visible                               | no popover                                    |

## Network calls expected during normal use

| trigger            | method | path                              | body                                                   |
| ------------------ | ------ | --------------------------------- | ------------------------------------------------------ |
| submit (success)   | POST   | /api/users/password-reset/confirm | `{ token, password }`; 200                             |
| submit (success)   | POST   | /api/sessions                     | `{ email, password }`; 201 returns tokens (auto-login) |
| submit (bad token) | POST   | /api/users/password-reset/confirm | 400/401 with error                                     |

## Coverage check (final pass)

- [x] navigate, snapshot, list, re-navigate, re-list — no new elements
- [x] every form field documented
- [x] both pre-fill paths (`?email`, `?token`) covered
- [x] both happy / bad-token states covered
- [x] all rows have a corresponding test in `e2e/reset-password.spec.ts`
