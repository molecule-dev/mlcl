# Page observations: /forgot-password (ForgotPassword)

> Filled by AI agent driving the running app on http://localhost:3020.

## Page state assumed

- [x] Public (no auth required), OR
- (n/a) Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                                               | role    | expected behavior on interaction                                    | success signal                               | failure signal                  |
| ------------------------------------------------------------------------ | ------- | ------------------------------------------------------------------- | -------------------------------------------- | ------------------------------- |
| `getByLabel(/Work email/i)` (autoComplete=email)                         | textbox | accepts an email value                                              | input has the typed value                    | empty / reset                   |
| `getByRole("button", { name: /Send recovery link/i })`                   | button  | POSTs to password-reset endpoint, swaps form for confirmation panel | "Email sent" badge + "Check your inbox" text | stays on form with inline error |
| `getByRole("button", { name: /I have my reset code/i })` (success state) | button  | navigates to /reset-password                                        | URL becomes /reset-password                  | stays on /forgot-password       |
| `getByRole("link", { name: /Back to sign in/i })` (footer)               | link    | navigates to /login                                                 | URL becomes /login                           | stays on /forgot-password       |

## Hidden surfaces opened from this page

| trigger     | what it opens                 | elements inside (selector / role / behavior)                                                           |
| ----------- | ----------------------------- | ------------------------------------------------------------------------------------------------------ |
| submit form | success panel (replaces form) | "Email sent" badge, "Check your inbox at {{email}}" text, "I have my reset code" CTA → /reset-password |

## Network calls expected during normal use

| trigger     | method | path                       | what request body or query is expected |
| ----------- | ------ | -------------------------- | -------------------------------------- |
| submit form | POST   | /api/users/forgot-password | { email }; response 200/201            |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in the matching spec file
