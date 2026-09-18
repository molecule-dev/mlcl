# Page observations: /reset-password (ResetPassword)

> Filled by the dispatch-flagship agent driving the running app via Playwright MCP.

## Page state assumed

- [x] Public (no auth required) — reads token from `?token=` query string

## Elements

| selector / accessible name          | role               | expected behavior on interaction | success signal            | failure signal                                     |
| ----------------------------------- | ------------------ | -------------------------------- | ------------------------- | -------------------------------------------------- |
| `input[type=password]` (first)      | textbox (password) | accept new password input        | value reflects typed text | value empty                                        |
| `getByRole("button", { name: /reset | submit             | update/i })`                     | button (submit)           | POST /api/users/reset-password with token+password | redirect to /login on success | inline error stays on page |
| `getByRole("link", { name: /back    | sign in            | log in/i })`                     | link                      | navigate back to /login                            | URL becomes /login            | stays on /reset-password   |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | (none)        | (none)                                       |

## Network calls expected during normal use

| trigger             | method | path                      | what request body or query is expected |
| ------------------- | ------ | ------------------------- | -------------------------------------- |
| Submit new password | POST   | /api/users/reset-password | { token, password } JSON               |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/reset-password.spec.ts`
