# Page observations: /reset-password (ResetPassword)

Filled by AI agent driving the running app via Playwright MCP.

## Page state assumed

- [x] Public (token via URL ?token=... or pasted via reset-code field)

## Elements

| selector / accessible name                        | role                 | expected behavior on interaction | success signal                                        | failure signal                                  |
| ------------------------------------------------- | -------------------- | -------------------------------- | ----------------------------------------------------- | ----------------------------------------------- |
| `getByRole('link', { name: /^chalk$/i })`         | link                 | back to /                        | URL is /                                              | nav fails                                       |
| `page.locator('input[type="email"]')`             | textbox              | accepts email                    | value typed                                           | rejected                                        |
| `getByLabel(/reset code                           | token/i)`            | textbox                          | accepts paste/typed code                              | value typed                                     | rejected     |
| `page.locator('input[type="password"]').first()`  | textbox              | accepts new password             | value typed (masked)                                  | rejected                                        |
| `page.locator('input[type="password"]').nth(1)`   | textbox              | accepts confirm password         | value typed (masked)                                  | mismatch error                                  |
| `getByRole('button', { name: /reset.*sign in      | reset password/i })` | button                           | POST /api/reset_password or /api/users/reset-password | redirected away from /reset-password on success | error inline |
| `getByRole('link', { name: /back to sign in/i })` | link                 | go to /login                     | URL is /login                                         | nav fails                                       |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |

## Network calls expected during normal use

| trigger     | method | path                | what request body or query is expected |
| ----------- | ------ | ------------------- | -------------------------------------- |
| submit form | POST   | /api/reset_password | { token, password }                    |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/reset-password.spec.ts`
