# Page observations: /reset-password (Set new password)

> Filled by the dispatch-flagship agent driving the running app via Playwright MCP.

## Page state assumed

- [x] Anonymous (loaded from forgot-password reset email link with `?token=…`)

## Elements

| selector / accessible name                            | role    | expected behavior on interaction                                            | success signal                                                 | failure signal           |
| ----------------------------------------------------- | ------- | --------------------------------------------------------------------------- | -------------------------------------------------------------- | ------------------------ |
| `getByRole('heading', { name: /set new password/i })` | heading | renders page title                                                          | heading visible                                                | absent                   |
| `input#password`                                      | textbox | accepts new password                                                        | value reflected (masked)                                       | input not found          |
| `input#confirm-password`                              | textbox | accepts password confirmation                                               | value reflected (masked)                                       | input not found          |
| `getByRole('button', { name: /reset password/i })`    | button  | submits to `/api/users/reset-password` (or surfaces a mismatch error first) | error banner with "do not match" OR navigation to success view | request never fires      |
| `getByRole('link', { name: /sign in/i })`             | link    | returns to `/login`                                                         | URL becomes /login                                             | stays on /reset-password |

## Hidden surfaces opened from this page

| trigger              | what it opens       | elements inside (selector / role / behavior)         |
| -------------------- | ------------------- | ---------------------------------------------------- |
| Mismatched passwords | inline error banner | `[role="alert"]` containing "Passwords do not match" |

## Network calls expected during normal use

| trigger                   | method | path                      | what request body or query is expected |
| ------------------------- | ------ | ------------------------- | -------------------------------------- |
| Submit form (matching pw) | POST   | /api/users/reset-password | `{ token, password }`                  |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/reset-password.spec.ts`
