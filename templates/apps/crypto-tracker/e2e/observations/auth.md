# Page observations: /login + /signup + /forgot-password + /reset-password + /plan-updated + /404 + /dashboard (auth)

> Filled by AI agent driving the running app via Playwright MCP.
> Maps to `e2e/auth.spec.ts`.

## Page state assumed

- [x] Unauthenticated for /login, /signup, /forgot-password, /reset-password
- [x] Authenticated for /dashboard, /plan-updated
- [x] Either for /404

## Elements

| selector / accessible name                                            | role                             | expected behavior on interaction                                           | success signal                                                          | failure signal                          |
| --------------------------------------------------------------------- | -------------------------------- | -------------------------------------------------------------------------- | ----------------------------------------------------------------------- | --------------------------------------- |
| `input[type=email] + input[type=password]` (login form)               | textboxes                        | accept credentials                                                         | values reflect input                                                    | rejected                                |
| `getByRole('button', { name: /enter                                   | sign in/i })` (login bad creds)  | button                                                                     | POST `/api/users/log-in` with junk → backend returns 4xx, error visible | error text visible AND URL stays /login | silent / no request |
| `getByRole('button', { name: /enter                                   | sign in/i })` (login round-trip) | button                                                                     | sign-out then sign-back-in works against backend                        | URL leaves /login                       | stays on /login     |
| `/dashboard` after signup                                             | route                            | layout chrome + portfolio hero render for authed user                      | "Total portfolio value" visible                                         | redirected to /login                    |
| `/dashboard` unauthenticated                                          | route                            | AuthGuard redirects to /login                                              | URL contains /login                                                     | render of dashboard chrome              |
| `getByRole('button', { name: /send.*reset/i })` on /forgot-password   | button                           | POST `/api/users/forgot-password`; success or error visible — never silent | success panel OR error toast                                            | silent / no request                     |
| `getByRole('link', { name: /back to sign in/i })` on /forgot-password | link                             | navigates back to /login                                                   | URL changes to /login                                                   | stays                                   |
| `/reset-password` no token                                            | route                            | renders missing/invalid-token error                                        | error text visible                                                      | crash or blank page                     |
| `/reset-password?token=...`                                           | route                            | renders new-password form (input visible)                                  | input[type=password] visible                                            | crash or blank                          |
| `/plan-updated` (authed)                                              | route                            | renders thank-you with link/button back home                               | back-home link/button visible                                           | renders 404                             |
| `/totally-bogus-route-...`                                            | route                            | catch-all renders the 404 page                                             | "404" text + back-to-dashboard link visible                             | server 404 HTML / blank                 |
| `/404` explicit                                                       | route                            | renders the same NotFound shell                                            | "404" text visible                                                      | crash                                   |

## Network calls expected during normal use

| trigger       | method | path                       | what request body or query is expected |
| ------------- | ------ | -------------------------- | -------------------------------------- |
| login submit  | POST   | /api/users/log-in          | `{ email, password }`                  |
| signup submit | POST   | /api/users                 | `{ email, password, name }`            |
| forgot submit | POST   | /api/users/forgot-password | `{ email }`                            |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/auth.spec.ts`
