# Page observations: /reset-password (ResetPassword)

Source: live walk via Playwright + e2e/reset-password.spec.ts. Each row maps to
an element exercised by a passing test that asserts on the real outcome
(network call, navigation, or DOM state change).

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                         | role               | expected behavior on interaction                                                   | success signal                                         | failure signal      |
| -------------------------------------------------- | ------------------ | ---------------------------------------------------------------------------------- | ------------------------------------------------------ | ------------------- |
| `input[name=password]`                             | textbox (password) | accepts new password                                                               | value reflects typed text                              | value empty         |
| `input[name=confirmPassword]`                      | textbox (password) | accepts confirm password                                                           | value reflects typed text                              | value empty         |
| `getByRole("button", { name: /reset password/i })` | button             | with no token shows error banner; with valid token POSTs /api/users/reset-password | error banner visible (no token) OR navigates to /login | no UI change at all |
| `getByRole("link", { name: /back to sign in/i })`  | link               | navigates to /login                                                                | URL becomes /login                                     | navigation fails    |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | —             | —                                            |

## Network calls expected during normal use

| trigger                          | method | path                      | what request body or query is expected |
| -------------------------------- | ------ | ------------------------- | -------------------------------------- |
| Submit new password (with token) | POST   | /api/users/reset-password | JSON { token, password } → 200         |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/reset-password.spec.ts`
