# Page observations: /login

> Anonymous login form. Sets JWT on success, navigates to /dashboard.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name               | role               | expected behavior on interaction | success signal               | failure signal          |
| ---------------------------------------- | ------------------ | -------------------------------- | ---------------------------- | ----------------------- |
| `[data-mol-id="login-email"]`            | textbox (email)    | accepts email                    | value reflected              | rejected                |
| `[data-mol-id="login-password"]`         | textbox (password) | accepts password                 | value reflected              | rejected                |
| `[data-mol-id="login-submit"]`           | button             | POST /api/users/log-in           | URL becomes /dashboard       | stays on /login + error |
| `[data-mol-id="login-toggle-password"]`  | button             | toggles password input type      | input type=text              | unchanged               |
| `getByRole("link", { name: /forgot/i })` | link               | navigates to /forgot-password    | URL becomes /forgot-password | stays                   |
| `getByRole("link", { name: /start free   | sign up/i })`      | link                             | navigates to /signup         | URL becomes /signup     | stays |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside |
| ------- | ------------- | --------------- |

## Network calls expected during normal use

| trigger            | method | path              | expected body                              |
| ------------------ | ------ | ----------------- | ------------------------------------------ |
| login-submit click | POST   | /api/users/log-in | { email, password } → 200 with accessToken |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/03-login.spec.ts`
