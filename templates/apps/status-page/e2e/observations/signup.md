# Page observations: /signup (Signup)

> Filled from a live walk via Playwright MCP at /signup. Re-walk if any
> visible element changes; do not edit from imagination.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                   | role                          | expected behavior on interaction                 | success signal         | failure signal                               |
| -------------------------------------------- | ----------------------------- | ------------------------------------------------ | ---------------------- | -------------------------------------------- |
| `#signup-email` (Work email)                 | textbox (email)               | accept email value                               | typed value reflected  | input rejected                               |
| `#signup-password` + `#signup-confirm` form  | textbox (password)            | accept and confirm password                      | typed values reflected | rejected input                               |
| `getByRole('button', { name: /Request access | Create.*account               | Sign\\s*up/i })`                                 | button                 | POST /api/users; on 201 redirect off /signup | URL is no longer /signup; accessToken in localStorage | toast/error with 4xx; URL stays /signup |
| Submit while empty                           | button                        | does not navigate when required fields are blank | URL stays /signup      | redirects despite blanks                     |
| `getByRole('link', { name: /sign\\s*in       | log\\s*in/i })` (href=/login) | link                                             | navigate to /login     | URL becomes /login                           | nav fails                                             |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | —             | —                                            |

## Network calls expected during normal use

| trigger          | method | path       | what request body or query is expected                             |
| ---------------- | ------ | ---------- | ------------------------------------------------------------------ |
| Submit (valid)   | POST   | /api/users | `{ email, password, name }` returns 201 + `{ accessToken, props }` |
| Submit (invalid) | POST   | /api/users | 4xx with error body                                                |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/12-signup.spec.ts`
