# Page observations: /login (Login)

> Filled from a live walk via Playwright MCP at /login. Re-walk if any
> visible element changes; do not edit from imagination.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                                       | role                        | expected behavior on interaction        | success signal                                                  | failure signal                                            |
| ---------------------------------------------------------------- | --------------------------- | --------------------------------------- | --------------------------------------------------------------- | --------------------------------------------------------- |
| `#email` + `#password` form                                      | textbox + textbox           | accept credentials and validate masking | typed values reflected                                          | inputs rejected                                           |
| `getByRole('button', { name: /^(log\\s*in                        | sign\\s*in)$/i })`          | button                                  | POST /api/users/login; on 200 store JWT and redirect off /login | URL no longer matches /login; accessToken in localStorage | error message; URL stays /login |
| `getByRole('link', { name: /forgot/i })` (href=/forgot-password) | link                        | navigate to /forgot-password            | URL becomes /forgot-password                                    | nav fails                                                 |
| `getByRole('link', { name: /sign\\s*up                           | create/i })` (href=/signup) | link                                    | navigate to /signup                                             | URL becomes /signup                                       | nav fails                       |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | —             | —                                            |

## Network calls expected during normal use

| trigger          | method | path             | what request body or query is expected                |
| ---------------- | ------ | ---------------- | ----------------------------------------------------- |
| Submit (valid)   | POST   | /api/users/login | `{ email, password }` returns 200 + `{ accessToken }` |
| Submit (invalid) | POST   | /api/users/login | 401/403 with error body                               |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/13-login.spec.ts`
