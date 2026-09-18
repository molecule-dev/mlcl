# Page observations: /reset-password (ResetPassword)

> Filled by the dispatch-flagship agent driving the running app via Playwright MCP.

## Page state assumed

- [x] Public (no auth required) — uses `?token=…` from emailed link

## Elements

| selector / accessible name                                  | role          | expected behavior on interaction                                  | success signal            | failure signal   |
| ----------------------------------------------------------- | ------------- | ----------------------------------------------------------------- | ------------------------- | ---------------- |
| `input[type=email]`                                         | textbox       | accept email matching the reset request                           | value reflects typed text | empty            |
| `input[placeholder=/Paste the link token/i]`                | textbox       | accept token (auto-prefilled from `?token=`)                      | value reflects token      | empty            |
| `input[type=password]` (new)                                | password      | accept new password                                               | value reflects typed text | empty            |
| `input[type=password]` (confirm)                            | password      | confirm new password                                              | value matches             | mismatch error   |
| `getByRole("button", { name: /reset password/i })` (submit) | button        | POST `/api/users/reset-password`, navigate to `/login` on success | URL `/login`              | stays with error |
| `getByRole("link", { name: /back to sign in/i })`           | link `/login` | navigates to login                                                | URL `/login`              | stays            |
| `getByRole("button", { name: /Toggle theme/i })`            | button        | flips theme mode                                                  | `data-mol-mode` flips     | unchanged        |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |

## Network calls expected during normal use

| trigger     | method | path                        | what request body or query is expected |
| ----------- | ------ | --------------------------- | -------------------------------------- |
| Submit form | POST   | `/api/users/reset-password` | `{ email, token, password }` JSON body |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/reset-password.spec.ts`
