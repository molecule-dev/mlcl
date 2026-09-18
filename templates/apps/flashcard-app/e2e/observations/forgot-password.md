# Page observations: /forgot-password (ForgotPassword)

> Filled by AI agent driving the running app via Playwright MCP. Rows below
> were captured from the live snapshot on http://localhost:3010 with a
> just-signed-up user, then re-walked once on a fresh load.

## Page state assumed

- [x] Public (no auth required), OR
- (n/a) Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                          | role    | expected behavior on interaction                  | success signal                                 | failure signal                        |
| --------------------------------------------------- | ------- | ------------------------------------------------- | ---------------------------------------------- | ------------------------------------- |
| `getByLabel(/email/i)`                              | textbox | accepts a target email                            | input has the typed value                      | value reset                           |
| `getByRole("button", { name: /Send reset link/i })` | button  | POST password reset request and show success card | submitted card with "Check your inbox" appears | no success card / stuck on submitting |
| `getByRole("link", { name: /Back to sign in/i })`   | link    | navigates to /login                               | URL becomes /login                             | stays on /forgot-password             |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |

## Network calls expected during normal use

| trigger | method | path                       | what request body or query is expected   |
| ------- | ------ | -------------------------- | ---------------------------------------- |
| submit  | POST   | /api/users/forgot-password | {email}; 2xx whether or not email exists |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in the matching spec file
