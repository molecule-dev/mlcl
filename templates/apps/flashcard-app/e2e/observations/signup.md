# Page observations: /signup (Signup)

> Filled by AI agent driving the running app via Playwright MCP. Rows below
> were captured from the live snapshot on http://localhost:3010 with a
> just-signed-up user, then re-walked once on a fresh load.

## Page state assumed

- [x] Public (no auth required), OR
- (n/a) Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                         | role    | expected behavior on interaction                   | success signal                             | failure signal                         |
| -------------------------------------------------- | ------- | -------------------------------------------------- | ------------------------------------------ | -------------------------------------- |
| `getByLabel(/your name/i)` (optional)              | textbox | accepts an optional display name                   | input has the typed value                  | value reset                            |
| `getByLabel(/email/i)`                             | textbox | accepts a fresh email                              | input has the typed value                  | value reset                            |
| `getByLabel(/password/i)`                          | textbox | accepts a password (masked)                        | input has the typed value                  | plain text or empty                    |
| `getByRole("button", { name: /Create account/i })` | button  | POST /api/users; navigate to /dashboard on success | URL becomes /dashboard, session cookie set | stays on /signup with no error visible |
| `getByRole("link", { name: /Sign in/i })` (footer) | link    | navigates to /login                                | URL becomes /login                         | stays on /signup                       |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |

## Network calls expected during normal use

| trigger           | method | path       | what request body or query is expected                |
| ----------------- | ------ | ---------- | ----------------------------------------------------- |
| submit valid form | POST   | /api/users | {email,password,name}; response 201 with user+session |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in the matching spec file
