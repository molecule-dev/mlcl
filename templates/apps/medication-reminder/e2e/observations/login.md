# Page observations: /login (Login)

> Filled by the dispatch-flagship agent driving the running app via Playwright MCP.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name | role    | expected behavior on interaction                         | success signal                                       | failure signal                  |
| -------------------------- | ------- | -------------------------------------------------------- | ---------------------------------------------------- | ------------------------------- |
| `email` input              | textbox | accepts an email address                                 | input value matches typed value                      | read-only or hidden             |
| `password` input           | textbox | accepts a password                                       | input value masked                                   | type is text                    |
| Log in submit button       | button  | POSTs /api/users/log-in; navigates off /login on success | URL no longer matches /login; defaults to /dashboard | stays on /login with auth error |
| Forgot password link       | link    | navigates to /forgot-password                            | URL is /forgot-password                              | stays on /login                 |
| Sign up link               | link    | navigates to /signup                                     | URL is /signup                                       | stays on /login                 |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | (none)        | (none)                                       |

## Network calls expected during normal use

| trigger       | method | path              | what request body or query is expected |
| ------------- | ------ | ----------------- | -------------------------------------- |
| Log in submit | POST   | /api/users/log-in | { email, password }                    |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/login.spec.ts`
