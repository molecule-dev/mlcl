# Page observations: /signup (Signup)

> Filled by the dispatch-flagship agent driving the running app via Playwright MCP.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                         | role               | expected behavior on interaction                                                    | success signal                                                      | failure signal                                         |
| -------------------------------------------------- | ------------------ | ----------------------------------------------------------------------------------- | ------------------------------------------------------------------- | ------------------------------------------------------ |
| `page.locator('#firstName')`                       | textbox            | accepts the user's first name                                                       | `toHaveValue` matches                                               | empty                                                  |
| `page.locator('#lastName')`                        | textbox            | accepts the user's last name                                                        | `toHaveValue` matches                                               | empty                                                  |
| `page.locator('#email')`                           | textbox (email)    | accepts a unique email                                                              | `toHaveValue` matches                                               | empty                                                  |
| `page.locator('#password')`                        | textbox (password) | accepts the password                                                                | `toHaveValue` matches                                               | empty                                                  |
| `page.locator('#confirmPassword')`                 | textbox (password) | accepts the password confirmation                                                   | `toHaveValue` matches                                               | empty                                                  |
| `getByRole('button', { name: /Create account/i })` | button (submit)    | POST `/api/users` to create a user and redirect to `/` once the access token is set | URL no longer contains `/signup` AND POST `/api/users` was observed | password-mismatch error rendered or stays on `/signup` |
| `getByRole('link', { name: /Sign in/i })`          | link               | switch to `/login`                                                                  | URL contains `/login`                                               | stays on `/signup`                                     |

## Hidden surfaces opened from this page

| trigger           | what it opens                      | elements inside                       |
| ----------------- | ---------------------------------- | ------------------------------------- |
| password mismatch | inline error toast inside the form | renders text "Passwords don't match." |

## Network calls expected during normal use

| trigger       | method | path       | what request body or query is expected |
| ------------- | ------ | ---------- | -------------------------------------- |
| Submit signup | POST   | /api/users | `{ email, password, name }`            |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/signup.spec.ts`
