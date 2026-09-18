# Page observations: /login (Login)

> Filled by the dispatch-flagship agent driving the running app via Playwright MCP.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                  | role               | expected behavior on interaction | success signal          | failure signal       |
| ------------------------------------------- | ------------------ | -------------------------------- | ----------------------- | -------------------- |
| `#fld-work-email`                           | textbox (email)    | accepts email input              | value updates           | no update            |
| `#fld-password`                             | textbox (password) | accepts password input           | value updates           | no update            |
| `getByRole("button", { name: /sign in/i })` | button             | POST /users/log-in then redirect | URL no longer /login    | inline error visible |
| forgot-password link                        | link               | navigates to /forgot-password    | URL is /forgot-password | no navigation        |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | (none)        | (none)                                       |

## Network calls expected during normal use

| trigger            | method | path              | what request body or query is expected |
| ------------------ | ------ | ----------------- | -------------------------------------- |
| submit credentials | POST   | /api/users/log-in | email + password JSON                  |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/login.spec.ts`
