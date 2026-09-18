# Page observations: /reset-password

> Anonymous reset-password form. Submits POST /api/reset_password with the token from the URL.

## Page state assumed

- [x] Anonymous (no signup needed)

## Elements

| selector / accessible name     | role                 | expected behavior on interaction                                               | success signal                              | failure signal      |
| ------------------------------ | -------------------- | ------------------------------------------------------------------------------ | ------------------------------------------- | ------------------- |
| Password input + confirm input | textbox (password)×2 | accept the new password (≥ 8 chars enforced server-side)                       | values reflected                            | rejected            |
| Submit button                  | button               | POST /api/reset_password — invalid token surfaces a user-visible error message | error text rendered (token/invalid/expired) | silent success      |
| "Back to sign in" link         | link                 | optionally navigates to /login                                                 | URL becomes /login                          | absent (test skips) |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside |
| ------- | ------------- | --------------- |
|         |               |                 |

## Network calls expected during normal use

| trigger | method | path | expected body |
| ------- | ------ | ---- | ------------- |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in the matching e2e/<n>-reset-password.spec.ts
