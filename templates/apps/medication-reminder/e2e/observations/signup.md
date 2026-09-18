# Page observations: /signup (Signup)

> Filled by the dispatch-flagship agent driving the running app via Playwright MCP.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name | role    | expected behavior on interaction                   | success signal                                                            | failure signal                   |
| -------------------------- | ------- | -------------------------------------------------- | ------------------------------------------------------------------------- | -------------------------------- |
| `email` input              | textbox | accepts an email address                           | input value matches typed value                                           | input is read-only               |
| `password` input           | textbox | accepts a password (≥8 chars enforced server-side) | input value masked                                                        | type is text                     |
| Sign up submit button      | button  | POSTs /api/users; navigates off /signup            | URL no longer matches /signup; localStorage molecule:auth:accessToken set | stays on /signup with form error |
| Log in link                | link    | navigates to /login                                | URL is /login                                                             | stays on /signup                 |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | (none)        | (none)                                       |

## Network calls expected during normal use

| trigger        | method | path       | what request body or query is expected |
| -------------- | ------ | ---------- | -------------------------------------- |
| Sign up submit | POST   | /api/users | { email, password, name? }             |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/signup.spec.ts`
