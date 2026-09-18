# Page observations: /reset-password (ResetPassword)

> Filled by AI agent driving the running app via Playwright MCP. Rows below
> were captured from the live snapshot on http://localhost:3010 with a
> just-signed-up user, then re-walked once on a fresh load.

## Page state assumed

- [x] Public (no auth required), OR
- (n/a) Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                         | role    | expected behavior on interaction                                           | success signal                | failure signal              |
| -------------------------------------------------- | ------- | -------------------------------------------------------------------------- | ----------------------------- | --------------------------- |
| `getByLabel(/email/i)`                             | textbox | accepts the email of the account being reset                               | input has the typed value     | value reset                 |
| `getByLabel(/Reset token/i)`                       | textbox | accepts the reset token from email                                         | input has the typed value     | value reset                 |
| `getByLabel(/New password/i)`                      | textbox | accepts a new password (masked)                                            | input has the typed value     | plain text or empty         |
| `getByLabel(/Confirm new password/i)`              | textbox | accepts the confirmation password                                          | input has the typed value     | plain text or empty         |
| `getByRole("button", { name: /Reset password/i })` | button  | POST reset; if confirm differs, show "Passwords do not match" inline error | inline mismatch alert visible | no error or hard navigation |
| `getByRole("link", { name: /Back to sign in/i })`  | link    | navigates to /login                                                        | URL becomes /login            | stays on /reset-password    |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |

## Network calls expected during normal use

| trigger      | method | path                      | what request body or query is expected |
| ------------ | ------ | ------------------------- | -------------------------------------- |
| submit valid | POST   | /api/users/reset-password | {token,password}; 2xx on valid token   |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in the matching spec file
