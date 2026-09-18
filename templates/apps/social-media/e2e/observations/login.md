# Page observations: /login (Login)

> Filled from a live walk via Playwright. Re-walk if any visible element
> changes; do not edit from imagination.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name           | role    | expected behavior on interaction                                     | success signal                                 | failure signal            |
| ------------------------------------ | ------- | -------------------------------------------------------------------- | ---------------------------------------------- | ------------------------- |
| `input[type=email]` (Email)          | textbox | accept email value                                                   | typed value reflected                          | input rejects             |
| `input[type=password]` (Password)    | textbox | accept password value                                                | typed value reflected, masked display          | input rejects             |
| `form button[type=submit]` (Sign in) | button  | POST `/api/users/log-in`; on success store JWT and redirect to /feed | URL becomes /feed, accessToken in localStorage | error and stays on /login |
| `a[href="/forgot-password"]`         | link    | navigate to /forgot-password                                         | URL becomes /forgot-password                   | nav fails                 |
| `a[href="/signup"]`                  | link    | navigate to /signup                                                  | URL becomes /signup                            | nav fails                 |
| `a[href="/"]` (brand link)           | link    | navigate to landing                                                  | URL becomes /                                  | nav fails                 |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | —             | —                                            |

## Network calls expected during normal use

| trigger                 | method | path              | what request body or query is expected                |
| ----------------------- | ------ | ----------------- | ----------------------------------------------------- |
| Sign In click (valid)   | POST   | /api/users/log-in | `{ email, password }` returns `{ accessToken, user }` |
| Sign In click (invalid) | POST   | /api/users/log-in | 401 with error message                                |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/login.spec.ts`
