# Page observations: /signup (Signup)

> Filled from a live walk via Playwright MCP at /signup.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                       | role    | expected behavior on interaction                 | success signal                  | failure signal                   |
| ------------------------------------------------ | ------- | ------------------------------------------------ | ------------------------------- | -------------------------------- |
| `[data-mol-id="signup-name"]` (Full name)        | textbox | accept full name                                 | typed value reflected           | input rejects                    |
| `[data-mol-id="signup-email"]` (Email)           | textbox | accept email value                               | typed value reflected           | input rejects                    |
| `[data-mol-id="signup-password"]` (Password)     | textbox | accept password value, minLength 8               | masked input, valid on ≥8 chars | invalid for shorter values       |
| `[data-mol-id="signup-submit"]` (Create account) | button  | POST /api/users; on success redirect off /signup | URL leaves /signup, cookie set  | toast/error and stays on /signup |
| `[data-mol-id="signup-login-link"]` (Sign in)    | link    | navigate to /login                               | URL becomes /login              | nav fails                        |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | —             | —                                            |

## Network calls expected during normal use

| trigger      | method | path          | what request body or query is expected                  |
| ------------ | ------ | ------------- | ------------------------------------------------------- |
| Submit       | POST   | /api/users    | `{ name, email, password }` returns user + token cookie |
| After submit | GET    | /api/users/me | recognizes the new session via cookie                   |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/signup.spec.ts`
