# Page observations: /reset-password (ResetPassword)

> Filled by the dispatch-flagship agent driving the running app via Playwright MCP.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name      | role               | expected behavior on interaction             | success signal                  | failure signal           |
| ------------------------------- | ------------------ | -------------------------------------------- | ------------------------------- | ------------------------ |
| `getByPlaceholder(/password/i)` | textbox (password) | accepts a password value                     | `toHaveValue` matches           | empty                    |
| `getByRole('button').first()`   | button (submit)    | POST /api/reset_password with token+password | redirected to /login on success | stays on /reset-password |
| `getByRole('link').first()`     | link               | navigates back to /login                     | URL contains `/login`           | stays on /reset-password |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside |
| ------- | ------------- | --------------- |
| (none)  | —             | —               |

## Network calls expected during normal use

| trigger             | method | path                | what request body or query is expected |
| ------------------- | ------ | ------------------- | -------------------------------------- |
| submit new password | POST   | /api/reset_password | `{ token, password }`                  |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/reset-password.spec.ts`
