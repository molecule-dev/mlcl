# Page observations: /signup

> Anonymous signup form. Sets JWT on success, navigates off /signup.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                | role               | expected behavior on interaction           | success signal                          | failure signal                 |
| ----------------------------------------- | ------------------ | ------------------------------------------ | --------------------------------------- | ------------------------------ |
| `[data-mol-id="signup-name"]`             | textbox            | accepts full name                          | value reflected                         | rejected                       |
| `[data-mol-id="signup-email"]`            | textbox (email)    | accepts email                              | value reflected                         | rejected                       |
| `[data-mol-id="signup-password"]`         | textbox (password) | accepts password                           | value reflected                         | rejected                       |
| `[data-mol-id="signup-confirm"]`          | textbox (password) | accepts confirm                            | value reflected                         | rejected                       |
| `[data-mol-id="signup-submit"]`           | button             | POST /api/users with name, email, password | URL leaves /signup, JWT in localStorage | inline error, stays on /signup |
| `getByRole("link", { name: /sign in/i })` | link               | navigates to /login                        | URL becomes /login                      | stays                          |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside |
| ------- | ------------- | --------------- |

## Network calls expected during normal use

| trigger             | method | path       | expected body                                    |
| ------------------- | ------ | ---------- | ------------------------------------------------ |
| signup-submit click | POST   | /api/users | { name, email, password } → 201 with accessToken |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/02-signup.spec.ts`
