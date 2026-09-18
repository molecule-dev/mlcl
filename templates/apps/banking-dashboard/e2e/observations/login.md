# Page observations: /login (Login)

Source: live walk via Playwright + e2e/login.spec.ts.

## Page state assumed

- [x] Public (unauthenticated)

## Elements

| selector / accessible name                                                    | role    | expected behavior on interaction                                                     | success signal                                    | failure signal                               |
| ----------------------------------------------------------------------------- | ------- | ------------------------------------------------------------------------------------ | ------------------------------------------------- | -------------------------------------------- |
| `input#email`                                                                 | textbox | accepts an email; required + type=email                                              | filling enables submit                            | input absent or wrong type                   |
| `input#password`                                                              | textbox | accepts password; show/hide toggle present                                           | password masked by default                        | input absent                                 |
| Show/hide password button (`getByRole('button', { name: /show password/i })`) | button  | toggles input type between password and text                                         | aria-label flips, type flips                      | toggle inert                                 |
| `form button[type="submit"]` (Sign In)                                        | button  | submits credentials → POST /api/users/log-in; on 200 redirects to / (then dashboard) | URL leaves /login, accessToken in localStorage    | error alert with bad creds (still on /login) |
| `[role="alert"][data-mol-id="login-error"]`                                   | alert   | renders when API returns 4xx                                                         | role=alert visible with message                   | error swallowed silently                     |
| `getByRole('link', { name: /forgot password/i })`                             | link    | navigates to /forgot-password                                                        | URL becomes /forgot-password, email field visible | URL unchanged                                |
| `getByRole('link', { name: /sign up/i })` (footer)                            | link    | navigates to /signup                                                                 | URL becomes /signup, name field visible           | URL unchanged                                |
| OAuth buttons (Google/GitHub/...)                                             | button  | clicking opens the provider OAuth flow                                               | redirect or popup begins                          | button inert                                 |

## Hidden surfaces opened from this page

| trigger                   | what it opens | elements inside (selector / role / behavior) |
| ------------------------- | ------------- | -------------------------------------------- |
| (none — single-form page) | —             | —                                            |

## Network calls expected during normal use

| trigger        | method | path              | what request body or query is expected     |
| -------------- | ------ | ----------------- | ------------------------------------------ |
| submit Sign In | POST   | /api/users/log-in | { email, password } → 200 with accessToken |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/login.spec.ts`
