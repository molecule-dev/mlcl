# Page observations: /reset-password (Reset password)

> Walked via Playwright on a fresh smoke-app at http://localhost:3130/reset-password?token=....

## Page state assumed

- [x] Anonymous (no auth required; token comes from URL query)

## Elements

| selector / accessible name                                 | role       | expected behavior on interaction                            | success signal                                          | failure signal                                                                       |
| ---------------------------------------------------------- | ---------- | ----------------------------------------------------------- | ------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `getByLabel(/^new password$/i), getByLabel(/^password$/i)` | textbox    | accepts the new password value                              | typed value mirrored                                    | input missing                                                                        |
| `getByLabel(/confirm/i)`                                   | textbox    | accepts the confirm-password value; must match the password | typed value mirrored, mismatch surfaces an inline error | mismatch silently accepted                                                           |
| `getByRole('button', { name: /reset                        | update     | submit/i })`                                                | button                                                  | POST /api/users/reset-password with token + password, redirects to /login on success | success redirect or success message | 4xx response with no UI feedback |
| `getByRole('link', { name: /log in                         | back/i })` | link                                                        | navigates back to /login                                | URL becomes /login                                                                   | no navigation                       |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |

## Network calls expected during normal use

| trigger | method | path                      | what request body or query is expected |
| ------- | ------ | ------------------------- | -------------------------------------- |
| Submit  | POST   | /api/users/reset-password | `{ token, password }`                  |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/reset-password.spec.ts`
