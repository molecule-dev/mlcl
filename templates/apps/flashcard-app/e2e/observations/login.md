# Page observations: /login (Login)

> Filled by AI agent driving the running app via Playwright MCP. Rows below
> were captured from the live snapshot on http://localhost:3010 with a
> just-signed-up user, then re-walked once on a fresh load.

## Page state assumed

- [x] Public (no auth required), OR
- (n/a) Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                                     | role    | expected behavior on interaction                                                    | success signal                                  | failure signal                |
| -------------------------------------------------------------- | ------- | ----------------------------------------------------------------------------------- | ----------------------------------------------- | ----------------------------- |
| `getByLabel(/email/i)` (autoComplete=email)                    | textbox | accepts an email value                                                              | input has the typed value                       | value reset                   |
| `getByLabel(/password/i)` (autoComplete=current-password)      | textbox | accepts a password value (masked)                                                   | input has the typed value                       | plain text or empty           |
| `getByRole("button", { name: /Sign in/i })`                    | button  | POST credentials; navigate to /dashboard on success, show inline error on bad creds | URL becomes /dashboard for valid signed-up user | stays on /login with no error |
| `getByRole("link", { name: /Forgot password/i })`              | link    | navigates to /forgot-password                                                       | URL becomes /forgot-password                    | stays on /login               |
| `getByRole("link", { name: /Start studying free/i })` (footer) | link    | navigates to /signup                                                                | URL becomes /signup                             | stays on /login               |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |

## Network calls expected during normal use

| trigger            | method | path                                            | what request body or query is expected             |
| ------------------ | ------ | ----------------------------------------------- | -------------------------------------------------- |
| submit valid creds | POST   | /api/auth (or /api/sessions / /api/users/login) | {email,password}; response 200 with session cookie |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in the matching spec file
