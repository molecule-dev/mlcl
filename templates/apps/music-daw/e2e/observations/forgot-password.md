# Page observations: /forgot-password (ForgotPassword)

> Filled from a Playwright MCP walk of the live app. Public, no auth.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                              | role    | expected behavior on interaction                                                                   | success signal                       | failure signal               |
| ------------------------------------------------------- | ------- | -------------------------------------------------------------------------------------------------- | ------------------------------------ | ---------------------------- |
| `getByRole('heading', { name: /Recover access/i })`     | heading | page heading                                                                                       | visible                              | missing                      |
| `#email` (`type="email" required autocomplete="email"`) | textbox | email field, required                                                                              | type=email + required                | missing                      |
| `getByRole('button', { name: /send reset link/i })`     | button  | submits POST `/api/users/forgot-password`; on success swaps body to `mark_email_read` confirmation | confirmation `role="status"` visible | stays on form, alert visible |
| `role="status"` panel after submit                      | status  | "If `<email>` exists, a reset link is on its way."                                                 | visible after successful submit      | not shown                    |
| `getByRole('link', { name: /back to sign in/i })`       | link    | returns to `/login` (visible after submit)                                                         | URL becomes `/login`                 | stays on `/forgot-password`  |
| footer "Back to sign in" link                           | link    | bottom-of-card link to `/login`                                                                    | href = `/login`                      | missing                      |
| brand `Fugue` heading                                   | heading | shared `AuthBrandHeader`                                                                           | visible                              | missing                      |

## Hidden surfaces opened from this page

| trigger        | what it opens             | elements inside (selector / role / behavior)                                     |
| -------------- | ------------------------- | -------------------------------------------------------------------------------- |
| submit success | inline confirmation panel | replaces the form with a "mark_email_read" success notice + back-to-sign-in link |

## Network calls expected during normal use

| trigger | method | path                         | what request body or query is expected                                                                                   |
| ------- | ------ | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| submit  | POST   | `/api/users/forgot-password` | `{ email }`; returns `200` and Mailgun is called for real users; `200` for unknown emails too (email enumeration safety) |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened (success swap covered)
- [x] Every form has every field documented
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/forgot-password.spec.ts`
