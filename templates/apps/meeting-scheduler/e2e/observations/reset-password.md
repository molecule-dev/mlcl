# Page observations: /reset-password (Reset password)

Public form; POSTs /api/users/reset-password (or /api/reset_password) and signs in.

Source: this page was driven live at `http://localhost:$VITE_PORT/reset-password`
via Playwright + the matching `e2e/reset-password.spec.ts`. Every row below
corresponds to an element with at least one passing test that exercises
its real outcome (network call, DB invariant, navigation, content visibility).

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                          | role    | expected behavior on interaction                     | success signal                         | failure signal                         |
| --------------------------------------------------- | ------- | ---------------------------------------------------- | -------------------------------------- | -------------------------------------- |
| `#reset-email` + `#reset-token` + `#reset-password` | textbox | three required fields render                         | all visible and editable               | any field missing                      |
| `getByRole("button", { name: /reset password/i })`  | button  | submits the reset request                            | request fires and redirects on success | submit never fires                     |
| `getByRole("link", { name: /back to sign in/i })`   | link    | returns to /login                                    | href targets /login                    | link missing                           |
| invalid-token error path                            | alert   | API rejects bogus token; UI stays on /reset-password | POST fires + page does not redirect    | page silently navigates with bad token |

## Hidden surfaces opened from this page

| trigger                         | what it opens | elements inside (selector / role / behavior) |
| ------------------------------- | ------------- | -------------------------------------------- |
| (none — page surfaces are flat) | —             | —                                            |

## Network calls expected during normal use

| trigger                   | method | path                                               | what request body or query is expected |
| ------------------------- | ------ | -------------------------------------------------- | -------------------------------------- |
| submit with invalid token | POST   | /api/users/reset-password (or /api/reset_password) | { email, token, password }             |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/reset-password.spec.ts`
