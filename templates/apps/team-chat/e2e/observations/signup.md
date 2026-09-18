# Page observations: /signup (Signup)

> Filled from a live walk via Playwright MCP at /signup.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                              | role    | expected behavior on interaction                          | success signal                                             | failure signal                |
| ------------------------------------------------------- | ------- | --------------------------------------------------------- | ---------------------------------------------------------- | ----------------------------- |
| `input[type=text]` (Full name)                          | textbox | accept name                                               | typed value                                                | rejects                       |
| `input[type=email]` (Email address)                     | textbox | accept email                                              | typed value                                                | rejects                       |
| `input[type=password]` (Password)                       | textbox | accept password                                           | masked typed value                                         | rejects                       |
| `getByRole('button', { name: /sign up/i })`             | button  | POST `/api/users` then store JWT and redirect off /signup | URL no longer matches /signup, accessToken in localStorage | error toast, stays on /signup |
| `getByRole('link', { name: /sign in/i })` (href=/login) | link    | navigate to /login                                        | URL is /login                                              | nav fails                     |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | —             | —                                            |

## Network calls expected during normal use

| trigger       | method | path       | what request body or query is expected                           |
| ------------- | ------ | ---------- | ---------------------------------------------------------------- |
| Sign up click | POST   | /api/users | `{ email, password, name }` returns `{ accessToken, user, ... }` |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/signup.spec.ts`
