# Page observations: /login (Login)

> Filled by the dispatch-flagship agent driving the running app via Playwright.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name | role    | expected behavior on interaction             | success signal                      | failure signal      |
| -------------------------- | ------- | -------------------------------------------- | ----------------------------------- | ------------------- |
| `#email` email field       | textbox | accepts email                                | input reflects typing               | input not focusable |
| `#password` password field | textbox | type=password                                | masked input                        | not masked          |
| "Sign in" submit           | button  | POST /api/users/log-in → redirect off /login | URL leaves `/login`, JWT in storage | error toast         |
| "Sign up" footer link      | link    | navigates to `/signup`                       | URL is `/signup`                    | wrong route         |
| "Forgot password" link     | link    | navigates to `/forgot-password`              | URL is `/forgot-password`           | wrong route         |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | (none)        | (none)                                       |

## Network calls expected during normal use

| trigger | method | path              | what request body or query is expected |
| ------- | ------ | ----------------- | -------------------------------------- |
| submit  | POST   | /api/users/log-in | email, password                        |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/login.spec.ts`
