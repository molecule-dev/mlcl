# Page observations: /forgot-password (ForgotPassword)

Source: live walk via Playwright + e2e/forgot-password.spec.ts.

## Page state assumed

- [x] Public (unauthenticated)

## Elements

| selector / accessible name                         | role    | expected behavior on interaction                                                       | success signal                               | failure signal                          |
| -------------------------------------------------- | ------- | -------------------------------------------------------------------------------------- | -------------------------------------------- | --------------------------------------- |
| `input#email`                                      | textbox | accepts email; required + type=email                                                   | input fills                                  | absent                                  |
| `form button[type="submit"]` (Send Reset Link)     | button  | POST /api/users/forgot-password { email }; on success swap to "Check your email." view | success view visible with email interpolated | request never fires / always-error view |
| Success view "Check your email."                   | text    | after submit, page replaces form with success state                                    | success heading visible                      | view never appears                      |
| Back-to-sign-in button (in success view)           | button  | navigates to /login                                                                    | URL becomes /login                           | URL unchanged                           |
| `getByRole('link', { name: /sign in/i })` (footer) | link    | navigates to /login                                                                    | URL becomes /login                           | URL unchanged                           |
| `[role="alert"][data-mol-id="forgot-error"]`       | alert   | renders when the API returns 4xx                                                       | alert visible with message                   | error swallowed silently                |

## Hidden surfaces opened from this page

| trigger                | what it opens                      | elements inside (selector / role / behavior)         |
| ---------------------- | ---------------------------------- | ---------------------------------------------------- |
| Submit Send Reset Link | the success-view replaces the form | "Check your email." heading + back-to-sign-in button |

## Network calls expected during normal use

| trigger                | method | path                       | what request body or query is expected |
| ---------------------- | ------ | -------------------------- | -------------------------------------- |
| submit Send Reset Link | POST   | /api/users/forgot-password | { email } → 200 success body           |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/forgot-password.spec.ts`
