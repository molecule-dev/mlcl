# Page observations: /reset-password (ResetPassword)

> Filled from a live walk via Playwright MCP at /reset-password.

## Page state assumed

- [x] Public (no auth required) — token consumed from URL params

## Elements

| selector / accessible name                             | role    | expected behavior on interaction                                                    | success signal                   | failure signal                             |
| ------------------------------------------------------ | ------- | ----------------------------------------------------------------------------------- | -------------------------------- | ------------------------------------------ |
| `[data-mol-id="reset-password"]` (New password)        | textbox | accept new password value                                                           | masked input                     | input rejects                              |
| `[data-mol-id="reset-confirm"]` (Confirm new password) | textbox | accept matching password                                                            | masked input                     | mismatched value triggers form-level error |
| `[data-mol-id="reset-submit"]` (Reset password)        | button  | POST /api/users/reset-password with token + password; redirect to /login on success | confirmation, redirect to /login | server error "invalid or expired token"    |
| `[data-mol-id="reset-back"]` (Back to sign in)         | link    | navigate to /login                                                                  | URL becomes /login               | nav fails                                  |

## Hidden surfaces opened from this page

| trigger                    | what it opens      | elements inside (selector / role / behavior)           |
| -------------------------- | ------------------ | ------------------------------------------------------ |
| Mismatched-password submit | inline error toast | "Passwords do not match" stays mounted; submit blocked |

## Network calls expected during normal use

| trigger              | method | path                      | what request body or query is expected            |
| -------------------- | ------ | ------------------------- | ------------------------------------------------- |
| Submit (valid token) | POST   | /api/users/reset-password | `{ token, password }` returns `{ success: true }` |
| Submit (bad token)   | POST   | /api/users/reset-password | 4xx with auth.resetPassword.invalidToken          |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/reset-password.spec.ts`
