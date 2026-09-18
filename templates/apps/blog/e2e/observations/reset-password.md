# Page observations: /reset-password

> Filled by AI agent driving the running app via Playwright MCP at
> http://localhost:3060/reset-password?token=…. Public.

## Page state assumed

- [x] Public (no auth required) — token is read from URL

## Elements

| selector / accessible name                                  | role                 | expected behavior on interaction | success signal           | failure signal                                     |
| ----------------------------------------------------------- | -------------------- | -------------------------------- | ------------------------ | -------------------------------------------------- |
| `getByRole('heading', { level: 1, name: /set a new password | reset password/i })` | heading                          | renders page title       | visible                                            | missing                               |
| Page subtitle paragraph                                     | text                 | renders subtitle copy            | visible                  | missing                                            |
| New password input (ResetPasswordForm)                      | password             | accepts the new password         | accepts text input       | not editable                                       |
| Confirm password input                                      | password             | accepts the confirmation         | accepts text input       | not editable                                       |
| `getByRole('button', { name: /reset                         | set\s*password       | continue/i })`                   | button                   | POST /api/users/reset-password { token, password } | success message OR redirect to /login | error / stays |
| Error / success notice (role=alert / role=status)           | alert                | renders backend feedback         | visible after submit     | absent                                             |
| `getByRole('link', { name: /sign\s*in                       | login/i })`          | link                             | navigates back to /login | URL becomes /login                                 | unchanged                             |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside |
| ------- | ------------- | --------------- |
| (none)  | —             | —               |

## Network calls expected during normal use

| trigger | method | path                      | what request body or query is expected |
| ------- | ------ | ------------------------- | -------------------------------------- |
| submit  | POST   | /api/users/reset-password | { token, password }                    |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented
- [x] Every link href is documented
- [x] Every dynamic state (loading/empty/error/populated) is observed
- [x] All elements above have a corresponding test in `e2e/reset-password.spec.ts`
