# Page observations: /signup (Signup)

> Filled from a live walk via Playwright. Re-walk if any visible element
> changes; do not edit from imagination.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                  | role    | expected behavior on interaction                              | success signal                                 | failure signal             |
| ------------------------------------------- | ------- | ------------------------------------------------------------- | ---------------------------------------------- | -------------------------- |
| `input[type=text]` (Display name)           | textbox | accept name value                                             | typed value reflected                          | input rejects              |
| `input[type=email]` (Email)                 | textbox | accept email value                                            | typed value reflected                          | input rejects              |
| `input[type=password]` (Password)           | textbox | accept password value                                         | typed value reflected, masked display          | input rejects              |
| `form button[type=submit]` (Create account) | button  | POST `/api/users`; on success store JWT and redirect to /feed | URL becomes /feed, accessToken in localStorage | error and stays on /signup |
| `a[href="/login"]` (Sign in)                | link    | navigate to /login                                            | URL becomes /login                             | nav fails                  |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | —             | —                                            |

## Network calls expected during normal use

| trigger                          | method | path       | what request body or query is expected                      |
| -------------------------------- | ------ | ---------- | ----------------------------------------------------------- |
| Create account (new email)       | POST   | /api/users | `{ email, password, name }` returns `{ accessToken, user }` |
| Create account (duplicate email) | POST   | /api/users | 409/400 with error message                                  |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/signup.spec.ts`
