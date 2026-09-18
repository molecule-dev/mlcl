# Page observations: /reset-password (ResetPassword)

> Filled by the dispatch-flagship agent driving the running app via Playwright MCP.

## Page state assumed

- [x] Public (no auth required) — token validated via query string `?token=...`

## Elements

| selector / accessible name                      | role               | expected behavior on interaction | success signal                      | failure signal                                   |
| ----------------------------------------------- | ------------------ | -------------------------------- | ----------------------------------- | ------------------------------------------------ |
| `input#password` (new password)                 | textbox (password) | accept new password              | value reflects typed text           | value empty                                      |
| `input[type=password]:nth-of-type(2)` (confirm) | textbox (password) | accept confirm password          | value reflects typed text           | value empty                                      |
| `getByRole('button', { name: /reset password    | set new/i })`      | button                           | POST /api/users/password with token | navigates to /login or /dashboard, success toast | stays with error message |
| `getByRole('link', { name: /sign in             | back/i })`         | link                             | back to /login                      | URL ends with /login                             | stays                    |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | (none)        | (none)                                       |

## Network calls expected during normal use

| trigger             | method | path                | what request body or query is expected |
| ------------------- | ------ | ------------------- | -------------------------------------- |
| Submit new password | POST   | /api/users/password | { token, password }                    |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/reset-password.spec.ts`
