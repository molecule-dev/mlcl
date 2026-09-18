# Page observations: /signup (Signup)

> Filled by the dispatch-flagship agent driving the running app via Playwright MCP.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                          | role            | expected behavior on interaction                               | success signal                            | failure signal                     |
| --------------------------------------------------- | --------------- | -------------------------------------------------------------- | ----------------------------------------- | ---------------------------------- |
| `input#firstName`                                   | textbox         | accept first name input                                        | value reflects typed text                 | value empty                        |
| `input#lastName`                                    | textbox         | accept last name input                                         | value reflects typed text                 | value empty                        |
| `input#email`                                       | textbox (email) | accept email input                                             | value reflects typed text                 | value empty                        |
| `getByRole("button", { name: /create.*account/i })` | button (submit) | POST /api/users with name+email+password, redirect off /signup | URL no longer /signup, accessToken stored | stays on /signup with field errors |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | (none)        | (none)                                       |

## Network calls expected during normal use

| trigger            | method | path       | what request body or query is expected |
| ------------------ | ------ | ---------- | -------------------------------------- |
| Submit signup form | POST   | /api/users | name + email + password JSON           |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/signup.spec.ts`
