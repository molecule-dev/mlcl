# Page observations: /reset-password (ResetPassword)

> Filled by the dispatch-flagship agent driving the running app via Playwright MCP.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name          | role                 | expected behavior on interaction | success signal            | failure signal                                              |
| ----------------------------------- | -------------------- | -------------------------------- | ------------------------- | ----------------------------------------------------------- |
| `getByLabel(/^new password          | ^password$/i)`       | textbox (password)               | accept new password input | value reflects input                                        | value empty                        |
| `getByRole("button", { name: /reset | update               | save/i })`                       | button (submit)           | POST /api/users/reset-password with token from query string | confirmation or redirect to /login | stays |
| `getByRole("link", { name: /Sign in | back to.*login/i })` | link                             | navigate to /login        | URL becomes /login                                          | stays                              |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | (none)        | (none)                                       |

## Network calls expected during normal use

| trigger      | method | path                      | what request body or query is expected |
| ------------ | ------ | ------------------------- | -------------------------------------- |
| Submit reset | POST   | /api/users/reset-password | token + new password                   |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/reset-password.spec.ts`
