# Page observations: /reset-password (ResetPassword)

## Page state assumed

- [x] Public (token in query string)

## Elements

| selector / accessible name | role   | expected behavior on interaction | success signal                | failure signal         |
| -------------------------- | ------ | -------------------------------- | ----------------------------- | ---------------------- |
| password input             | input  | accepts a new password           | value updates                 | weak password rejected |
| confirm password input     | input  | accepts confirmation             | value updates                 | mismatch rejected      |
| submit button              | button | POST /api/users/reset-password   | redirect to /login or success | error rendered         |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |

## Network calls expected during normal use

| trigger | method | path                      | what request body or query is expected |
| ------- | ------ | ------------------------- | -------------------------------------- |
| submit  | POST   | /api/users/reset-password | { token, password }                    |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/reset-password.spec.ts`
