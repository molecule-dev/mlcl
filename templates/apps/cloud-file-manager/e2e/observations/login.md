# Page observations: /login (Login)

> Filled from a live walk via Playwright MCP at /login. Re-walk if any
> visible element changes; do not edit from imagination.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                              | role    | expected behavior on interaction                       | success signal                                     | failure signal                                      |
| ------------------------------------------------------- | ------- | ------------------------------------------------------ | -------------------------------------------------- | --------------------------------------------------- |
| `[data-mol-id="login-email"]` (Email address)           | textbox | accept email value                                     | typed value reflected                              | input rejects                                       |
| `[data-mol-id="login-password"]` (Password)             | textbox | accept password value                                  | typed value masked                                 | input rejects                                       |
| `[data-mol-id="login-show-password"]` (Show password)   | button  | toggle password input type to text/password            | input becomes type=text then back to type=password | nothing toggles                                     |
| `[data-mol-id="login-submit"]` (Sign in)                | button  | POST /api/users/log-in; on success redirect off /login | URL leaves /login, JWT cookie set                  | toast "Wrong email or password" and stays on /login |
| `[data-mol-id="login-forgot"]` (Forgot?)                | link    | navigate to /forgot-password                           | URL becomes /forgot-password                       | nav fails                                           |
| `[data-mol-id="login-signup-link"]` (Create an account) | link    | navigate to /signup                                    | URL becomes /signup                                | nav fails                                           |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | —             | —                                            |

## Network calls expected during normal use

| trigger                 | method | path              | what request body or query is expected                   |
| ----------------------- | ------ | ----------------- | -------------------------------------------------------- |
| Sign in click (valid)   | POST   | /api/users/log-in | `{ email, password }` returns user + access token cookie |
| Sign in click (invalid) | POST   | /api/users/log-in | 401 with error message                                   |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/login.spec.ts`
