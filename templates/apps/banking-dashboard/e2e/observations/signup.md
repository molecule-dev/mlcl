# Page observations: /signup (Signup)

Source: live walk via Playwright + e2e/signup.spec.ts.

## Page state assumed

- [x] Public (unauthenticated)

## Elements

| selector / accessible name                         | role    | expected behavior on interaction                                                  | success signal                                   | failure signal                 |
| -------------------------------------------------- | ------- | --------------------------------------------------------------------------------- | ------------------------------------------------ | ------------------------------ |
| `input#name`                                       | textbox | accepts the user's display name; optional                                         | input fills                                      | absent                         |
| `input#email`                                      | textbox | accepts email; required + type=email                                              | input fills                                      | absent                         |
| `input#password`                                   | textbox | accepts password; minLength=8 + show/hide toggle                                  | masked by default                                | absent                         |
| Show/hide password button                          | button  | toggles password input type                                                       | type/aria-label flips                            | inert                          |
| `form button[type="submit"]` (Create Account)      | button  | submits → POST /api/users; on success redirects off /signup, persists accessToken | URL leaves /signup, localStorage has accessToken | error alert / still on /signup |
| `[role="alert"][data-mol-id="signup-error"]`       | alert   | renders when API returns 4xx                                                      | role=alert visible with message                  | error swallowed silently       |
| `getByRole('link', { name: /sign in/i })` (footer) | link    | navigates to /login                                                               | URL becomes /login, email field visible          | URL unchanged                  |
| OAuth buttons (Google/GitHub/...)                  | button  | clicking opens provider OAuth flow                                                | redirect / popup begins                          | button inert                   |

## Hidden surfaces opened from this page

| trigger                   | what it opens | elements inside (selector / role / behavior) |
| ------------------------- | ------------- | -------------------------------------------- |
| (none — single-form page) | —             | —                                            |

## Network calls expected during normal use

| trigger               | method | path       | what request body or query is expected                         |
| --------------------- | ------ | ---------- | -------------------------------------------------------------- |
| submit Create Account | POST   | /api/users | { email, password, name? } → 200 with accessToken + user props |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/signup.spec.ts`
