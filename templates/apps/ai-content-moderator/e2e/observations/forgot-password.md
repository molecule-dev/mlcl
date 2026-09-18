# Page observations: /forgot-password (ForgotPassword)

Source: live walk via Playwright + e2e/forgot-password.spec.ts.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                  | role          | expected behavior on interaction  | success signal                  | failure signal                 |
| ------------------------------------------- | ------------- | --------------------------------- | ------------------------------- | ------------------------------ |
| `getByLabel(/email/i)`                      | textbox       | enter email to request reset link | value persists, allows submit   | empty blocks submit            |
| `getByRole('button', { name: /send          | reset/i })`   | button                            | POSTs /api/users/password-reset | success status message visible | inline error  |
| `getByRole('link', { name: /back to sign in | sign in/i })` | link                              | navigates to /login             | URL becomes /login             | URL unchanged |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | —             | —                                            |

## Network calls expected during normal use

| trigger            | method | path                      | what request body or query is expected               |
| ------------------ | ------ | ------------------------- | ---------------------------------------------------- |
| submit valid email | POST   | /api/users/password-reset | { email } → 200 (always, to avoid email enumeration) |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/forgot-password.spec.ts`
