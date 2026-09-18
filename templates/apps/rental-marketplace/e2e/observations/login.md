# Page observations: /login (Login)

Sign-in form using `useLogin` from `@molecule/app-react` — POSTs to the
auth endpoint, persists the access token, then navigates to the page the
user was originally trying to reach (or `/search` by default).

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                        | role   | expected behavior on interaction | success signal                                                           | failure signal                             |
| ------------------------------------------------- | ------ | -------------------------------- | ------------------------------------------------------------------------ | ------------------------------------------ |
| `getByRole('textbox', { name: /email/i })`        | input  | type email                       | accepts text                                                             | empty submit blocked by required attribute |
| password input                                    | input  | type password                    | accepts text                                                             | wrong password → inline error from server  |
| `getByRole('link', { name: /forgot/i })`          | link   | navigate to /forgot-password     | URL changes to /forgot-password                                          | no navigation                              |
| `getByRole('button', { name: /sign\s*in/i })`     | button | submit credentials               | redirected to /search (or pre-redirect URL); accessToken in localStorage | inline error; URL stays at /login          |
| `getByRole('link', { name: /create.*account/i })` | link   | navigate to /signup              | URL becomes /signup                                                      | no navigation                              |

## Hidden surfaces opened from this page

(none — single form)

## Network calls expected during normal use

| trigger              | method | path          | what request body or query is expected            |
| -------------------- | ------ | ------------- | ------------------------------------------------- |
| submit               | POST   | /api/login    | { email, password } → 200 + { accessToken, user } |
| post-login bootstrap | GET    | /api/users/me | 200 with profile                                  |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/login.spec.ts`
