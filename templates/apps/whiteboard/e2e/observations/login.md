# Page observations: /login (Login)

> Public sign-in form: email + password. On 2xx, lands on `/boards`
> with a Bearer token in `localStorage['molecule:auth:accessToken']`.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                                                                                       | role | expected behavior on interaction                       | success signal                                                      | failure signal            |
| ---------------------------------------------------------------------------------------------------------------- | ---- | ------------------------------------------------------ | ------------------------------------------------------------------- | ------------------------- |
| email + password fields + submit (`input[type="email"]`, `input[type="password"]`, `form button[type="submit"]`) | form | POST /api/users/log-in; on 2xx leaves /login → /boards | URL no longer matches `/login` and a token persists in localStorage | stays on /login           |
| same form with bad password                                                                                      | form | POST /api/users/log-in fails; UI stays on /login       | URL still matches `/login`                                          | silently lands on /boards |
| `a[href="/forgot-password"]`                                                                                     | link | nav to /forgot-password                                | URL becomes `/forgot-password`                                      | broken link               |
| `a[href="/signup"]`                                                                                              | link | nav to /signup                                         | URL becomes `/signup`                                               | broken link               |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside |
| ------- | ------------- | --------------- |

## Network calls expected during normal use

| trigger               | method | path              | what request body or query is expected                   |
| --------------------- | ------ | ----------------- | -------------------------------------------------------- |
| submit (success)      | POST   | /api/users/log-in | `{ email, password }`; 200 returns `{ id, accessToken }` |
| submit (bad password) | POST   | /api/users/log-in | 4xx; UI stays on /login                                  |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/login.spec.ts`
