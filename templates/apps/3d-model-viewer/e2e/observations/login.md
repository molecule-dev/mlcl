# Page observations: /login (Login)

> Filled by the dispatch-flagship agent driving the running app via Playwright MCP.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                           | role               | expected behavior on interaction                | success signal            | failure signal             |
| ---------------------------------------------------- | ------------------ | ----------------------------------------------- | ------------------------- | -------------------------- |
| `input#email`                                        | textbox (email)    | accept email input                              | value reflects typed text | value empty                |
| `input#password`                                     | textbox (password) | accept password input                           | value reflects typed text | value empty                |
| `getByRole("button", { name: /sign in/i })` (submit) | button             | POST /api/users/log-in then redirect off /login | URL no longer /login      | stays on /login with error |

## Hidden surfaces opened from this page

| trigger            | what it opens          | elements inside (selector / role / behavior)   |
| ------------------ | ---------------------- | ---------------------------------------------- |
| Show password icon | inline password reveal | input#password type changes from password→text |

## Network calls expected during normal use

| trigger            | method | path              | what request body or query is expected |
| ------------------ | ------ | ----------------- | -------------------------------------- |
| Submit credentials | POST   | /api/users/log-in | email + password JSON body             |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/login.spec.ts`
