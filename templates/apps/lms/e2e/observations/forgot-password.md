# Page observations: /forgot-password (Forgot password request)

> Filled by the dispatch-flagship agent driving the running app via Playwright MCP.

## Page state assumed

- [x] Anonymous (no signup)

## Elements

| selector / accessible name                               | role    | expected behavior on interaction                                                                     | success signal               | failure signal                |
| -------------------------------------------------------- | ------- | ---------------------------------------------------------------------------------------------------- | ---------------------------- | ----------------------------- |
| `getByRole('heading', { name: /reset your password/i })` | heading | renders page title                                                                                   | heading visible              | absent                        |
| `input#email`                                            | textbox | accepts email address for the reset request                                                          | value reflected              | input not found               |
| `getByRole('button', { name: /send reset link/i })`      | button  | submits the form, fires POST to `/api/users/forgot-password`, transitions to "Check your email" view | confirmation heading appears | error banner or stuck on form |
| `getByRole('link', { name: /back to sign in/i })`        | link    | navigates back to `/login`                                                                           | URL becomes /login           | stays on /forgot-password     |

## Hidden surfaces opened from this page

| trigger     | what it opens                         | elements inside (selector / role / behavior)                                  |
| ----------- | ------------------------------------- | ----------------------------------------------------------------------------- |
| Submit form | "Check your email" confirmation panel | `getByRole('heading', { name: /check your email/i })`, link "Back to sign in" |

## Network calls expected during normal use

| trigger           | method | path                       | what request body or query is expected |
| ----------------- | ------ | -------------------------- | -------------------------------------- |
| Submit reset form | POST   | /api/users/forgot-password | `{ email: <typed value> }`             |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/forgot-password.spec.ts`
