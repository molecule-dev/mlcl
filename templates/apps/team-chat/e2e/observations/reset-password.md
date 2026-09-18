# Page observations: /reset-password (ResetPassword)

> Filled from a live walk via Playwright MCP at /reset-password?token=...

## Page state assumed

- [x] Public (no auth required, but expects a `?token=…` query param)

## Elements

| selector / accessible name                         | role    | expected behavior on interaction                                                           | success signal                              | failure signal                    |
| -------------------------------------------------- | ------- | ------------------------------------------------------------------------------------------ | ------------------------------------------- | --------------------------------- |
| `input[type=password]` (New password)              | textbox | accept new password                                                                        | typed value (masked)                        | rejects                           |
| `input[type=password]` (Confirm password)          | textbox | accept confirmation                                                                        | typed value (masked)                        | mismatch surfaces error           |
| `getByRole('button', { name: /reset password/i })` | button  | POST `/api/users/reset-password` with `{ token, password }`; redirect to /login on success | URL becomes /login or success message shown | error toast w/ invalid-token copy |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | —             | —                                            |

## Network calls expected during normal use

| trigger              | method | path                      | what request body or query is expected                                     |
| -------------------- | ------ | ------------------------- | -------------------------------------------------------------------------- |
| Reset Password click | POST   | /api/users/reset-password | `{ token, password }` returns 200 on success, 400 with invalid-token error |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/reset-password.spec.ts`
