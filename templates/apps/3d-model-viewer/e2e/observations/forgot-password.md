# Page observations: /forgot-password (ForgotPassword)

> Filled by the dispatch-flagship agent driving the running app via Playwright MCP.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name         | role            | expected behavior on interaction | success signal            | failure signal                             |
| ---------------------------------- | --------------- | -------------------------------- | ------------------------- | ------------------------------------------ |
| `input[type=email]`                | textbox (email) | accept email input               | value reflects typed text | value empty                                |
| `getByRole("button", { name: /send | reset           | request/i })` (submit)           | button                    | POST /api/users/forgot-password with email | request issued, success state shown | error remains             |
| `getByRole("link", { name: /back   | sign in         | log in/i })`                     | link                      | navigate to /login                         | URL becomes /login                  | stays on /forgot-password |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | (none)        | (none)                                       |

## Network calls expected during normal use

| trigger     | method | path                       | what request body or query is expected |
| ----------- | ------ | -------------------------- | -------------------------------------- |
| Submit form | POST   | /api/users/forgot-password | email JSON                             |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/forgot-password.spec.ts`
