# Page observations: /login (Login)

> Filled by AI agent driving the running app via Playwright. Captured
> from the rendered page after `browser_navigate /login` +
> `browser_snapshot`.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                        | role                 | expected behavior on interaction     | success signal                           | failure signal                  |
| ------------------------------------------------- | -------------------- | ------------------------------------ | ---------------------------------------- | ------------------------------- |
| `#email` (Email)                                  | textbox              | accepts a valid email address        | input value updates, no validation error | red border, message about email |
| `#password` (Password)                            | textbox              | accepts password text, type=password | input value updates                      | inline error                    |
| `getByRole('button', { name: /sign in/i })`       | button               | submits form, POST /api/users/log-in | redirect away from /login (auth set)     | stays on /login, inline error   |
| `getByRole('link', { name: /forgot/i })`          | link                 | navigates to /forgot-password        | URL becomes /forgot-password             | no nav                          |
| `getByRole('link', { name: /sign up               | create account/i })` | link                                 | navigates to /signup                     | URL becomes /signup             | no nav |
| `getByRole('button', { name: /show password/i })` | button               | toggles password visibility          | input type flips text/password           | no toggle                       |

## Hidden surfaces opened from this page

| trigger                                | what it opens | elements inside |
| -------------------------------------- | ------------- | --------------- |
| (none — login is a single static form) | —             | —               |

## Network calls expected during normal use

| trigger                    | method | path              | expected body       |
| -------------------------- | ------ | ----------------- | ------------------- |
| Submit valid credentials   | POST   | /api/users/log-in | { email, password } |
| Submit invalid credentials | POST   | /api/users/log-in | returns 4xx         |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/login.spec.ts`
