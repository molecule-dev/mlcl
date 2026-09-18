# Page observations: /reset-password (ResetPassword)

> Captured from the rendered page after navigating to /reset-password?token=demo.

## Page state assumed

- [x] Public — token is in the URL query string

## Elements

| selector / accessible name                   | role                  | expected behavior on interaction | success signal                 | failure signal               |
| -------------------------------------------- | --------------------- | -------------------------------- | ------------------------------ | ---------------------------- |
| `#new-password` (New password)               | textbox               | accepts new password             | value persists                 | inline validation            |
| `#confirm-password` (Confirm password)       | textbox               | accepts password again           | value persists                 | mismatch error               |
| `getByRole('button', { name: /reset password | update password/i })` | button                           | POST /api/users/reset-password | confirmation + nav to /login | inline error |
| `getByRole('link', { name: /back to log      | sign in/i })`         | link                             | nav to /login                  | URL becomes /login           | no nav       |

## Hidden surfaces opened from this page

| trigger          | what it opens                      | elements inside           |
| ---------------- | ---------------------------------- | ------------------------- |
| Successful reset | confirmation panel + auto-redirect | check icon + sign-in link |

## Network calls expected during normal use

| trigger     | method | path                      | expected body       |
| ----------- | ------ | ------------------------- | ------------------- |
| Submit form | POST   | /api/users/reset-password | { token, password } |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/reset-password.spec.ts`
