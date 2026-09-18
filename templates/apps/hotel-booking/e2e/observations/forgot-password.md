# Page observations: /forgot-password (ForgotPassword)

> Filled by the dispatch-flagship agent driving the running app via Playwright MCP.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                          | role            | expected behavior on interaction                                                   | success signal                                                            | failure signal                              |
| --------------------------------------------------- | --------------- | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------- | ------------------------------------------- |
| `page.locator('#email')`                            | textbox (email) | accepts an email value                                                             | `toHaveValue` matches                                                     | empty                                       |
| `getByRole('button', { name: /Send reset link/i })` | button (submit) | POST the reset request and show a "check your email" confirmation in the form area | confirmation paragraph rendered (text mentions "check your email" / sent) | stays in initial state without confirmation |
| `getByRole('link', { name: /Back to sign in/i })`   | link            | navigates to `/login`                                                              | URL contains `/login`                                                     | stays on `/forgot-password`                 |
| `getByRole('link', { name: /Sojourn/i }).first()`   | link            | brand link returns to `/`                                                          | URL ends with `/`                                                         | stays on `/forgot-password`                 |

## Hidden surfaces opened from this page

| trigger        | what it opens                                  | elements inside                                                 |
| -------------- | ---------------------------------------------- | --------------------------------------------------------------- |
| Submit success | inline confirmation card replaces the form CTA | renders `Check your email` heading and a `Back to sign in` link |

## Network calls expected during normal use

| trigger              | method | path                       | what request body or query is expected                  |
| -------------------- | ------ | -------------------------- | ------------------------------------------------------- |
| Submit reset request | POST   | /api/users/forgot-password | `{ email }` (request enqueued, response is best-effort) |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/forgot-password.spec.ts`
