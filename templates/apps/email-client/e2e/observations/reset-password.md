# Page observations: /reset-password (Reset Password)

> Filled by the dispatch-flagship agent driving the running app via Playwright MCP.

## Page state assumed

- [x] Public (token-gated; reachable via reset-password email link `?token=…`)

## Elements

| selector / accessible name                  | role               | expected behavior on interaction | success signal            | failure signal                                          |
| ------------------------------------------- | ------------------ | -------------------------------- | ------------------------- | ------------------------------------------------------- |
| `input[type="password"]` (new password)     | textbox (password) | accept new password              | value reflects typed text | empty value                                             |
| `input[type="password"]` (confirm password) | textbox (password) | must match new password          | inline match indicator    | mismatch error displayed on submit                      |
| `getByRole("button", { name: /reset         | update             | submit/i })`                     | button                    | POST /api/users/reset-password with { token, password } | success message + link back to /login | error message rendered |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | (none)        | (none)                                       |

## Network calls expected during normal use

| trigger | method | path                      | what request body or query is expected |
| ------- | ------ | ------------------------- | -------------------------------------- |
| Submit  | POST   | /api/users/reset-password | { token, password }                    |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/reset-password.spec.ts`
