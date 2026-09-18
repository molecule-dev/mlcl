# Page observations: /reset-password (Reset Password)

Captured by walking the live reset-password page (vite=3110, api=4110)
after a fresh `mlcl create`. Public — no auth required.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                              | role                                           | expected behavior on interaction                                                                                 | success signal                                        | failure signal                                                        |
| ------------------------------------------------------- | ---------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- | --------------------------------------------------------------------- |
| `[data-mol-id="page-reset-password"]`                   | container                                      | the page shell renders                                                                                           | element visible                                       | element absent                                                        |
| `getByRole('heading', { name: /set a new password/i })` | heading                                        | h2 introducing the form                                                                                          | rendered                                              | rendered                                                              |
| `#email` (only when `?email=` not in URL)               | textbox                                        | accepts the email of the account whose password is being reset                                                   | value persists                                        | input rejects                                                         |
| `#token` (only when `?token=` not in URL)               | textbox                                        | accepts the reset token issued in the email                                                                      | value persists                                        | input rejects                                                         |
| `[data-mol-id="reset-password"]`                        | textbox (type=password, minLength=8, required) | accepts the new password                                                                                         | value persists                                        | minLength blocks submit                                               |
| `[data-mol-id="reset-confirm"]`                         | textbox (type=password)                        | confirms the new password                                                                                        | value persists                                        | mismatch shows inline error                                           |
| `[data-mol-id="reset-toggle-password"]`                 | button                                         | toggles password visibility                                                                                      | input.type flips between password ↔ text              | clicking does nothing                                                 |
| `[data-mol-id="reset-submit"]`                          | button (submit)                                | calls `useLogin().login()` with `{email, password, passwordResetToken}` and navigates to `/dashboard` on success | URL becomes `/dashboard` after successful reset+login | stays on `/reset-password`; `[data-mol-id=reset-error]` alert renders |
| `[data-mol-id="reset-error"]`                           | alert                                          | only renders when the API rejects the token (expired/invalid)                                                    | error text from server                                | absent if no error                                                    |
| `[data-mol-id="reset-login-link"]`                      | link                                           | "Back to sign in" — navigates to `/login`                                                                        | URL becomes `/login`                                  | URL stays                                                             |

## Hidden surfaces opened from this page

| trigger                                  | what it opens | elements inside (selector / role / behavior) |
| ---------------------------------------- | ------------- | -------------------------------------------- |
| (none — single form, no modals or menus) | —             | —                                            |

## Network calls expected during normal use

| trigger     | method | path                | what request body or query is expected                                                                        |
| ----------- | ------ | ------------------- | ------------------------------------------------------------------------------------------------------------- |
| submit form | POST   | `/api/users/log-in` | `{ email, password, passwordResetToken }` JSON; 200 returns `{ accessToken, user }`, 401 on bad/expired token |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/17-reset-password.spec.ts`
