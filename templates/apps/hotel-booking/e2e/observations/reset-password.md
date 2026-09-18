# Page observations: /reset-password (ResetPassword)

> Filled by the dispatch-flagship agent driving the running app via Playwright MCP.

## Page state assumed

- [x] Public (no auth required, but expects a `?token=` query param)

## Elements

| selector / accessible name                         | role               | expected behavior on interaction                                                                                         | success signal                        | failure signal             |
| -------------------------------------------------- | ------------------ | ------------------------------------------------------------------------------------------------------------------------ | ------------------------------------- | -------------------------- |
| `page.locator('#password')`                        | textbox (password) | accepts the new password                                                                                                 | `toHaveValue` matches                 | empty                      |
| `page.locator('#confirmPassword')`                 | textbox (password) | accepts the password confirmation                                                                                        | `toHaveValue` matches                 | empty                      |
| `getByRole('button', { name: /Reset password/i })` | button (submit)    | POST `/api/users/reset-password` with the token + new password and either show success or render the missing-token error | success card rendered or inline error | stays without feedback     |
| `getByRole('link', { name: /Back to sign in/i })`  | link               | navigates to `/login`                                                                                                    | URL contains `/login`                 | stays on `/reset-password` |
| `getByRole('link', { name: /Sojourn/i }).first()`  | link               | brand link returns to `/`                                                                                                | URL ends with `/`                     | stays on `/reset-password` |

## Hidden surfaces opened from this page

| trigger          | what it opens     | elements inside            |
| ---------------- | ----------------- | -------------------------- |
| Missing `?token` | inline error card | text "missing reset token" |

## Network calls expected during normal use

| trigger                          | method | path                      | what request body or query is expected |
| -------------------------------- | ------ | ------------------------- | -------------------------------------- |
| Submit new password (with token) | POST   | /api/users/reset-password | `{ token, password }`                  |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/reset-password.spec.ts`
