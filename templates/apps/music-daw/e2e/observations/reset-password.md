# Page observations: /reset-password (ResetPassword)

> Filled from a Playwright MCP walk of the live app. Public, accepts
> `?token=…&email=…` query string from the email reset link.

## Page state assumed

- [x] Public (no auth required); usually arrived at via reset email link

## Elements

| selector / accessible name                              | role    | expected behavior on interaction                                                                            | success signal                   | failure signal                        |
| ------------------------------------------------------- | ------- | ----------------------------------------------------------------------------------------------------------- | -------------------------------- | ------------------------------------- |
| `getByRole('heading', { name: /set a new password/i })` | heading | page heading                                                                                                | visible                          | missing                               |
| `#reset-email` (`type="email" required`)                | textbox | prefilled from `?email=` if present                                                                         | accepts text + email type        | missing                               |
| `#reset-token` (`type="text" required`)                 | textbox | prefilled from `?token=` if present                                                                         | accepts text                     | missing                               |
| `#reset-new` (`type="password" required`)               | textbox | new password                                                                                                | accepts text                     | missing                               |
| `#reset-confirm` (`type="password" required`)           | textbox | confirm password                                                                                            | accepts text                     | missing                               |
| `getByRole('button', { name: /show password/i })`       | button  | toggles password visibility on `#reset-new` and `#reset-confirm`                                            | type flips between password/text | unchanged                             |
| `getByRole('button', { name: /reset password/i })`      | button  | submits to `/api/users/reset-password` then auto-logs-in via `/api/users/log-in`, navigates to `/dashboard` | URL = `/dashboard`, token stored | stays on `/reset-password` with alert |
| mismatch alert                                          | text    | `role="alert"` if confirm ≠ password; suppresses POST                                                       | alert visible, no POST           | POST fired with mismatch              |
| invalid-token alert                                     | alert   | red error from `confirmError` if token rejected                                                             | alert visible                    | silently succeeds                     |
| `getByRole('link', { name: /back to sign in/i })`       | link    | footer link to `/login`                                                                                     | href = `/login`                  | missing                               |

## Hidden surfaces opened from this page

| trigger | what it opens        | elements inside (selector / role / behavior) |
| ------- | -------------------- | -------------------------------------------- |
| (none)  | reset is single-form | n/a                                          |

## Network calls expected during normal use

| trigger          | method | path                        | what request body or query is expected                           |
| ---------------- | ------ | --------------------------- | ---------------------------------------------------------------- |
| submit           | POST   | `/api/users/reset-password` | `{ token, password }`; returns 200 on valid token, 4xx otherwise |
| submit (success) | POST   | `/api/users/log-in`         | follow-up auto-login `{ email, password }`                       |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened (none here)
- [x] Every form has every field documented
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/reset-password.spec.ts`
