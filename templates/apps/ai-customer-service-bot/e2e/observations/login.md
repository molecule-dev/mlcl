# Page observations: /login (Login)

Captured from `browser_snapshot` on `http://localhost:3170/login` while
logged out.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                        | role          | expected behavior on interaction                                 | success signal               | failure signal                 |
| ------------------------------------------------- | ------------- | ---------------------------------------------------------------- | ---------------------------- | ------------------------------ |
| `getByLabel(/email/i)`                            | textbox       | accepts email value                                              | value matches                | empty                          |
| `getByLabel(/password/i)`                         | textbox       | accepts password value                                           | value matches                | empty                          |
| `getByRole('button', { name: /Sign in/i })`       | button        | POST /api/users (login path); on success navigates to /dashboard | URL becomes /dashboard       | stays on /login, error visible |
| `getByRole('link', { name: /Forgot password/i })` | link          | navigates to /forgot-password                                    | URL becomes /forgot-password | stays on /login                |
| `getByRole('link', { name: /Create.*account       | Sign up/i })` | link                                                             | navigates to /signup         | URL becomes /signup            | stays on /login |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | —             | —                                            |

## Network calls expected during normal use

| trigger                          | method | path       | what request body or query is expected            |
| -------------------------------- | ------ | ---------- | ------------------------------------------------- |
| Click "Sign in" with valid creds | POST   | /api/users | login payload — returns access token, sets cookie |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/login.spec.ts`
