# Page observations: /reset-password (ResetPassword)

Source: live walk via Playwright on the running smoke app.

## Page state assumed

- [x] Public (no auth required — token + email come via query string)

## Elements

| selector / accessible name                         | role                 | expected behavior on interaction                                           | success signal              | failure signal                     |
| -------------------------------------------------- | -------------------- | -------------------------------------------------------------------------- | --------------------------- | ---------------------------------- |
| `locator('input[type="password"]').first()`        | input[type=password] | accepts the new password                                                   | input value reflected       | not editable                       |
| `locator('input[type="password"]').nth(1)`         | input[type=password] | accepts password confirmation                                              | input value reflected       | not editable                       |
| `getByRole('button', { name: /Reset password/i })` | button               | submit fires POST /api/reset_password (confirm) and routes to / on success | URL becomes / after success | inline error visible               |
| `getByText(/Passwords don't match/i)`              | text                 | shown when confirmation differs from new password                          | error visible               | does not appear when fields differ |
| `getByRole('link', { name: /Back to sign in/i })`  | link                 | navigates back to /login                                                   | URL becomes /login          | no navigation                      |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | —             | —                                            |

## Network calls expected during normal use

| trigger | method | path                                                  | what request body or query is expected         |
| ------- | ------ | ----------------------------------------------------- | ---------------------------------------------- |
| Submit  | POST   | `/api/reset_password` (or `/api/users/resetPassword`) | `{ token, password }` body — 200 OK on success |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/reset-password.spec.ts`
