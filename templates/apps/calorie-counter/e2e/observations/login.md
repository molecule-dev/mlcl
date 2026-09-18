# Page observations: /login (Login)

Source: live walk via Playwright + e2e/login.spec.ts. Each row maps to
an element exercised by a passing test that asserts on the real outcome
(network call, navigation, or DOM state change).

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                          | role               | expected behavior on interaction                | success signal               | failure signal             |
| --------------------------------------------------- | ------------------ | ----------------------------------------------- | ---------------------------- | -------------------------- |
| `input[type=email]`                                 | textbox (email)    | accepts typed email                             | value reflects typed text    | value empty                |
| `input[type=password]`                              | textbox (password) | accepts typed password                          | value reflects typed text    | value empty                |
| `getByRole("button", { name: /sign in/i })`         | button             | POST /api/users/log-in then redirect off /login | URL no longer /login         | stays on /login with error |
| `getByRole("link", { name: /create an account/i })` | link               | navigates to /signup                            | URL becomes /signup          | navigation fails           |
| `getByRole("link", { name: /forgot password/i })`   | link               | navigates to /forgot-password                   | URL becomes /forgot-password | navigation fails           |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | —             | —                                            |

## Network calls expected during normal use

| trigger            | method | path              | what request body or query is expected |
| ------------------ | ------ | ----------------- | -------------------------------------- |
| Submit credentials | POST   | /api/users/log-in | JSON { email, password } → 200         |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/login.spec.ts`
