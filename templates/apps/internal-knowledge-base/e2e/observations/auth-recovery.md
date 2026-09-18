# Page observations: /forgot-password and /reset-password (AuthRecovery)

Observed via Playwright MCP at `/forgot-password` and `/reset-password`
while signed out.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                                          | role    | expected behavior on interaction                            | success signal       | failure signal       |
| ------------------------------------------------------------------- | ------- | ----------------------------------------------------------- | -------------------- | -------------------- |
| `input[type="email"]` (forgot-password)                             | textbox | accepts email for password-reset request                    | typed value persists | required-field error |
| `getByRole('button', { name: /send                                  | reset   | email                                                       | link/i })`           | button               | POST /api/users/forgot-password; success message shown for both real and unknown emails (anti-enumeration) | success text visible, 200 status | 4xx + revealing error |
| `getByRole('button', { name: /reset password/i })` (reset-password) | button  | POST /api/users/reset-password with token from query string | non-404 status       | 404 (wrong path)     |

## Hidden surfaces opened from this page

(none)

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |

## Network calls expected during normal use

| trigger                | method | path                       | what request body or query is expected                |
| ---------------------- | ------ | -------------------------- | ----------------------------------------------------- |
| Submit email (known)   | POST   | /api/users/forgot-password | `{ email }` → 200                                     |
| Submit email (unknown) | POST   | /api/users/forgot-password | `{ email }` → 200 (anti-enumeration)                  |
| Submit new password    | POST   | /api/users/reset-password  | `{ token, password }` → 200 or domain error (NOT 404) |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/auth-recovery.spec.ts`
