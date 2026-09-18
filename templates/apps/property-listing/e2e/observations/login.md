# Page observations: /login (login)

Sign-in form using the live auth bond.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name | role    | expected behavior on interaction                      | success signal      | failure signal                |
| -------------------------- | ------- | ----------------------------------------------------- | ------------------- | ----------------------------- |
| email input                | textbox | accepts email text                                    | value persists      | rejected                      |
| password input             | input   | accepts password text                                 | value persists      | rejected                      |
| submit button              | button  | POST /api/users/log-in then redirect away from /login | URL leaves /login   | inline error, stays on /login |
| link to /signup            | link    | navigate to /signup                                   | URL becomes /signup | no navigation                 |

## Hidden surfaces opened from this page

(none — single page)

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |

## Network calls expected during normal use

| trigger | method | path              | what request body or query is expected  |
| ------- | ------ | ----------------- | --------------------------------------- |
| submit  | POST   | /api/users/log-in | { email, password } → 200 + accessToken |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/login.spec.ts`
