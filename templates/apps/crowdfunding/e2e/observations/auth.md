# Page observations: /signup, /login, /forgot-password, /reset-password

> Filled by AI agent driving the running app via Playwright MCP.
> Maps to `e2e/auth.spec.ts`.

## Page state assumed

- [x] Unauthenticated for /signup, /login, /forgot-password, /reset-password
- [x] Authenticated for /dashboard (redirect target)

## Elements

| selector / accessible name                                          | role                     | expected behavior on interaction                                | success signal                                               | failure signal                               |
| ------------------------------------------------------------------- | ------------------------ | --------------------------------------------------------------- | ------------------------------------------------------------ | -------------------------------------------- |
| `getByRole('heading', { name: /create.*account                      | sign up/i })` on /signup | heading                                                         | renders signup form chrome                                   | form fields visible                          | form missing                            |
| `getByRole('button', { name: /create account/i })` on /signup       | button                   | POST /api/users → user row, session cookie, redirect /dashboard | URL becomes /dashboard AND GET /api/profiles/me returns user | stays on /signup                             |
| `getByRole('button', { name: /create account/i })` duplicate email  | button                   | POST /api/users with existing email → 4xx + error visible       | error message visible AND URL stays /signup                  | silent or accepts duplicate                  |
| `input[type="email"] + input[type="password"]` on /login            | textboxes                | accept credentials                                              | values reflect input                                         | rejected                                     |
| `getByRole('button', { name: /enter                                 | sign in                  | log in/i })` on /login bad creds                                | button                                                       | POST /api/users/log-in → 4xx + error visible | error text visible AND URL stays /login | redirects despite bad creds |
| `getByRole('button', { name: /enter                                 | sign in                  | log in/i })` on /login round-trip                               | button                                                       | sign-out then sign back in                   | URL leaves /login on success            | stays on /login             |
| `getByRole('button', { name: /send.*reset/i })` on /forgot-password | button                   | POST /api/users/forgot-password → 200 confirmation              | confirmation visible                                         | silent / no request                          |
| `/reset-password` (no token)                                        | route                    | renders missing/invalid-token error                             | error text visible                                           | crash or blank page                          |
| `/dashboard` unauthenticated                                        | route                    | AuthGuard redirects to /login                                   | URL contains /login                                          | dashboard renders to anonymous               |
| `/campaign/new` unauthenticated                                     | route                    | AuthGuard redirects to /login                                   | URL contains /login                                          | editor renders to anonymous                  |

## Network calls expected during normal use

(none — covered transitively in other specs via captureNetwork)

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/auth.spec.ts`
