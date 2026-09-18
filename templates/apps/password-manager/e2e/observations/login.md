# Page observations: /login (Login)

> Filled from a live walk via Playwright MCP at /login. Re-walk if any
> visible element changes; do not edit from imagination.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                        | role         | expected behavior on interaction      | success signal                                                    | failure signal                            |
| ------------------------------------------------- | ------------ | ------------------------------------- | ----------------------------------------------------------------- | ----------------------------------------- |
| `input[type=email]` (Email)                       | textbox      | accept email value                    | value typed                                                       | input rejects                             |
| `input[type=password]` (Master Password)          | textbox      | accept master password value (masked) | value typed (masked)                                              | input rejects                             |
| `getByRole('button', { name: /sign in             | unlock/i })` | button                                | POST /api/users/log-in; on success store JWT, redirect off /login | URL no longer /login + accessToken stored | error toast, stays on /login |
| `getByRole('link', { name: /forgot password/i })` | link         | navigate to /forgot-password          | URL becomes /forgot-password                                      | nav fails                                 |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | —             | —                                            |

## Network calls expected during normal use

| trigger                 | method | path              | what request body or query is expected                              |
| ----------------------- | ------ | ----------------- | ------------------------------------------------------------------- |
| Sign In click (valid)   | POST   | /api/users/log-in | `{ email, password }` returns `{ accessToken, refreshToken, user }` |
| Sign In click (invalid) | POST   | /api/users/log-in | 401 with error message                                              |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in the matching spec
