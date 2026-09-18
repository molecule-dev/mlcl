# Page observations: /reset-password (ResetPassword)

> Filled by the dispatch-flagship agent driving the running app via Playwright.

## Page state assumed

- [x] Public (token-gated, no auth required)

## Elements

| selector / accessible name | role    | expected behavior on interaction | success signal                       | failure signal      |
| -------------------------- | ------- | -------------------------------- | ------------------------------------ | ------------------- |
| password field             | textbox | type=password, masked            | input reflects typing                | not masked          |
| confirm password field     | textbox | mismatch shows error             | mismatch alert visible               | alert never appears |
| "Reset password" submit    | button  | POST /api/users/reset-password   | success message + redirect to /login | error toast         |
| "Back to sign in" link     | link    | navigates to `/login`            | URL is `/login`                      | wrong route         |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | (none)        | (none)                                       |

## Network calls expected during normal use

| trigger | method | path                      | what request body or query is expected |
| ------- | ------ | ------------------------- | -------------------------------------- |
| submit  | POST   | /api/users/reset-password | token, password                        |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/reset-password.spec.ts`
