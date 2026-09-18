# Page observations: /reset-password (reset-password)

Reset password using the token in the URL.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name | role   | expected behavior on interaction                 | success signal     | failure signal |
| -------------------------- | ------ | ------------------------------------------------ | ------------------ | -------------- |
| new-password input         | input  | accepts password                                 | value persists     | rejected       |
| confirm-password input     | input  | accepts password                                 | value persists     | rejected       |
| submit button              | button | PATCH /api/users/password and redirect to /login | URL becomes /login | inline error   |

## Hidden surfaces opened from this page

(none — single page)

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |

## Network calls expected during normal use

| trigger | method | path                | what request body or query is expected |
| ------- | ------ | ------------------- | -------------------------------------- |
| submit  | PATCH  | /api/users/password | { token, password } → 200              |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/reset-password.spec.ts`
