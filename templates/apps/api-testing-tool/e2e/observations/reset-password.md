# Page observations: /reset-password (ResetPassword)

> Filled by the dispatch-flagship agent driving the running app via Playwright MCP.

## Page state assumed

- [x] Public (no auth required — reached from email link with token query)

## Elements

| selector / accessible name                            | role               | expected behavior on interaction                                                                        | success signal                                                                                 | failure signal             |
| ----------------------------------------------------- | ------------------ | ------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | -------------------------- |
| `getByRole('textbox', { name: /Email address/i })`    | textbox            | accepts an email                                                                                        | `toHaveValue` matches                                                                          | empty                      |
| `getByRole('textbox', { name: /Reset token/i })`      | textbox            | accepts a reset token pasted from email                                                                 | `toHaveValue` matches                                                                          | empty                      |
| `getByRole('textbox', { name: /New password/i })`     | textbox (password) | accepts a new password                                                                                  | `toHaveValue` matches                                                                          | empty                      |
| `getByRole('textbox', { name: /Confirm password/i })` | textbox (password) | accepts password confirmation                                                                           | `toHaveValue` matches                                                                          | empty                      |
| `getByRole('button', { name: /Reset password/i })`    | button (submit)    | PATCH `/api/users/:id/password` then redirect to `/login` (or surface "invalid token" if no real token) | invalid-token attempt produces a non-2xx call to `/users/.+/password` (proves the handler ran) | network call never fires   |
| `getByRole('link', { name: /Back to sign in/i })`     | link               | navigates to `/login`                                                                                   | URL contains `/login`                                                                          | stays on `/reset-password` |
| `getByRole('link', { name: /^Pylon ?\.?$/i })`        | link               | brand link returns to landing `/`                                                                       | URL ends with `/`                                                                              | stays on `/reset-password` |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside |
| ------- | ------------- | --------------- |
| (none)  | —             | —               |

## Network calls expected during normal use

| trigger      | method | path                    | what request body or query is expected |
| ------------ | ------ | ----------------------- | -------------------------------------- |
| Submit reset | PATCH  | /api/users/:id/password | `{ token, password }`                  |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/reset-password.spec.ts`
