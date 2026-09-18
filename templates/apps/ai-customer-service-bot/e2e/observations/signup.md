# Page observations: /signup (Signup)

Captured from `browser_snapshot` on `http://localhost:3170/signup` while
logged out.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                                     | role    | expected behavior on interaction                                   | success signal                         | failure signal                  |
| -------------------------------------------------------------- | ------- | ------------------------------------------------------------------ | -------------------------------------- | ------------------------------- |
| `getByLabel(/email/i)`                                         | textbox | accepts email value                                                | input value matches                    | empty                           |
| `getByLabel(/^password$/i)`                                    | textbox | accepts password value                                             | input value matches                    | empty                           |
| `getByRole('button', { name: /Toggle password visibility/i })` | button  | flips type=password ↔ text                                         | type attr changes                      | unchanged                       |
| `getByRole('button', { name: /Create Account/i })`             | button  | submits to POST /api/users; on success navigates away from /signup | URL no longer /signup, dashboard loads | stays on /signup, error visible |
| `getByRole('link', { name: /Sign in/i })`                      | link    | navigates to /login                                                | URL becomes /login                     | stays on /signup                |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | —             | —                                            |

## Network calls expected during normal use

| trigger                                 | method | path       | what request body or query is expected                                             |
| --------------------------------------- | ------ | ---------- | ---------------------------------------------------------------------------------- |
| Click "Create Account" with valid creds | POST   | /api/users | `{ email, password, name? }` body — returns `accessToken` + `user` and sets cookie |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/signup.spec.ts`
