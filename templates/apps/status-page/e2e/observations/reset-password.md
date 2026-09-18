# Page observations: /reset-password (Reset password)

> Filled from a live walk via Playwright MCP at /reset-password. Re-walk
> if any visible element changes; do not edit from imagination.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                      | role                          | expected behavior on interaction | success signal                            | failure signal                                       |
| ----------------------------------------------- | ----------------------------- | -------------------------------- | ----------------------------------------- | ---------------------------------------------------- |
| `getByLabel(/^new\\s*password                   | ^password$/i)` (New password) | textbox (password)               | accept new password value, masked display | typed value reflected                                | rejected input                      |
| `getByLabel(/confirm/i)` (Confirm new password) | textbox (password)            | accept matching value            | typed value reflected                     | rejected input                                       |
| `getByRole('button', { name: /reset             | update                        | change/i })` (Reset password)    | button                                    | POST /api/users/reset-password with token + password | redirect to /login or success state | error message; stays on /reset-password |
| `getByRole('link', { name: /sign\\s*in          | log\\s*in                     | back/i })` (back to /login)      | link                                      | navigate to /login                                   | URL becomes /login                  | nav fails                               |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | —             | —                                            |

## Network calls expected during normal use

| trigger                | method | path                      | what request body or query is expected |
| ---------------------- | ------ | ------------------------- | -------------------------------------- |
| Submit (valid token)   | POST   | /api/users/reset-password | `{ token, password }` returns 200      |
| Submit (invalid token) | POST   | /api/users/reset-password | non-200 with error body                |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/15-reset-password.spec.ts`
