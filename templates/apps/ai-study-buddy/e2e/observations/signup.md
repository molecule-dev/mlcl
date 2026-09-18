# Page observations: /signup (Signup)

Captured by walking the live signup page (vite=3110, api=4110) after a
fresh `mlcl create`. Re-run the inventory + observe-page tooling to
refresh.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                                       | role    | expected behavior on interaction                                                            | success signal                                                                                      | failure signal                                   |
| ---------------------------------------------------------------- | ------- | ------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| `[data-mol-id="signup-name"]`                                    | textbox | accepts the user's display name (optional, free text)                                       | value persists in the input                                                                         | input rejects keystrokes                         |
| `[data-mol-id="signup-email"]` (type=email, required, autoFocus) | textbox | accepts an email; required field for submission                                             | browser email validation passes; value present                                                      | "please include @" browser error                 |
| `[data-mol-id="signup-password"]` (type=password, minLength=8)   | textbox | accepts a password >= 8 chars                                                               | value present, browser allows submit                                                                | minlength validation blocks submit               |
| `[data-mol-id="signup-toggle-password"]`                         | button  | toggles password input between password ↔ text                                              | input `type` flips, eye icon swaps                                                                  | clicking does nothing                            |
| `[data-mol-id="signup-submit"]`                                  | button  | submits POST `/api/users` with name/email/password and navigates to `/dashboard` on success | URL becomes `/dashboard` and access token persisted in `localStorage` (`molecule:auth:accessToken`) | stays on `/signup`, `signup-error` alert appears |
| `[data-mol-id="signup-error"]`                                   | alert   | only renders when API responds with an error (e.g. duplicate email)                         | text describes the error                                                                            | absent if no error                               |
| `[data-mol-id="signup-login-link"]`                              | link    | navigates to `/login` for users who already have an account                                 | URL becomes `/login`                                                                                | stays on `/signup`                               |

## Hidden surfaces opened from this page

| trigger                                | what it opens | elements inside (selector / role / behavior) |
| -------------------------------------- | ------------- | -------------------------------------------- |
| (none — flat page; no menus or modals) | —             | —                                            |

## Network calls expected during normal use

| trigger     | method | path         | what request body or query is expected                                 |
| ----------- | ------ | ------------ | ---------------------------------------------------------------------- |
| submit form | POST   | `/api/users` | `{ email, password, name? }` JSON; 200 returns `{ accessToken, user }` |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/14-signup.spec.ts`
