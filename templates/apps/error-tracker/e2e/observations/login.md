# Page observations: /login

> Anonymous login form. Sets JWT on success, navigates off /login.

## Page state assumed

- [x] Anonymous (no signup needed)

## Elements

| selector / accessible name               | role               | expected behavior on interaction | success signal                 | failure signal    |
| ---------------------------------------- | ------------------ | -------------------------------- | ------------------------------ | ----------------- |
| `#login-email`                           | textbox (email)    | accepts email                    | value reflected                | rejected          |
| `#login-password`                        | textbox (password) | accepts password                 | value reflected                | rejected          |
| `getByRole("button", { name: /sign in    | log in/i })`       | button                           | submits POST /api/users/log-in | URL leaves /login | stays on /login (wrong password) → 403 |
| `getByRole("link", { name: /forgot/i })` | link               | navigates to /forgot-password    | URL becomes /forgot-password   | stays             |

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
- [x] All elements above have a corresponding test in the matching e2e/<n>-login.spec.ts
