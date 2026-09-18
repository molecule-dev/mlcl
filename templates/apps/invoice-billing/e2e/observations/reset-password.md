# Page observations: /reset-password (ResetPassword)

> Consumes a reset token issued via /forgot-password and lets the user
> set a new password. The user's `users_secrets` row is updated and the
> token cleared. Successful reset enables the user to sign in with the
> new password.

## Page state assumed

- [x] Public (no auth required); user comes here from the email link

## Elements

| selector / accessible name                          | role               | expected behavior on interaction                                 | success signal                                                   | failure signal       |
| --------------------------------------------------- | ------------------ | ---------------------------------------------------------------- | ---------------------------------------------------------------- | -------------------- |
| `getByLabel(/account email/i)`                      | textbox (email)    | required                                                         | retained                                                         | required-field flash |
| `getByLabel(/reset token/i)`                        | textbox            | required; pre-fillable from URL `?token=…`                       | retained                                                         | required-field flash |
| `getByLabel(/new password/i)`                       | textbox (password) | required, min length                                             | masked                                                           | required-field flash |
| `getByLabel(/confirm new password/i)`               | textbox (password) | required, must match                                             | masked                                                           | mismatch error       |
| `getByRole('button', { name: /^Reset password$/ })` | button             | POSTs token+new password; on success surfaces "password updated" | success state visible; subsequent /login with new password works | error banner         |
| `getByRole('link', { name: /Back to sign in/ })`    | link               | navigates to `/login`                                            | URL ends `/login`                                                | stays                |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |

## Network calls expected during normal use

| trigger                             | method | path                | what request body or query is expected |
| ----------------------------------- | ------ | ------------------- | -------------------------------------- |
| Reset password submit (valid token) | POST   | /api/reset-password | `{ email, token, password }`; 200      |
| Reset password submit (bad token)   | POST   | /api/reset-password | 4xx; UI surfaces error                 |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/reset-password.spec.ts`
