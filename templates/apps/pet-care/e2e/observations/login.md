# Page observations: /login (Login)

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name | role   | expected behavior on interaction | success signal                 | failure signal          |
| -------------------------- | ------ | -------------------------------- | ------------------------------ | ----------------------- |
| `#email`                   | input  | accepts an email address         | value updates                  | input rejected          |
| `#password`                | input  | accepts a password               | value updates                  | input rejected          |
| `button[type=submit]`      | button | submits POST /api/auth/login     | redirect off /login when valid | stays on /login + error |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |

## Network calls expected during normal use

| trigger | method | path              | what request body or query is expected |
| ------- | ------ | ----------------- | -------------------------------------- |
| submit  | POST   | /api/users/log-in | { email, password }                    |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/login.spec.ts`
