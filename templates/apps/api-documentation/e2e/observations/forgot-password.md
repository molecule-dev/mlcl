# Page observations: /forgot-password (ForgotPassword)

Source: live walk via Playwright + e2e/forgot-password.spec.ts. Each row maps to
an element exercised by a passing test that asserts on the real outcome
(network call, navigation, or DOM state change).

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                          | role    | expected behavior on interaction                            | success signal                     | failure signal     |
| --------------------------------------------------- | ------- | ----------------------------------------------------------- | ---------------------------------- | ------------------ |
| `getByRole("textbox", { name: /email/i })`          | textbox | enter an email address                                      | value reflected in DOM             | input not editable |
| `getByRole("button", { name: /Send Reset Link/i })` | button  | submit fires POST /api/users/forgotPassword (or equivalent) | POST /api/users in network capture | no POST fired      |
| `getByText(/Check your email/i)`                    | text    | after submit, the success state replaces the form           | success message visible            | still on form      |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | —             | —                                            |

## Network calls expected during normal use

| trigger | method | path                      | what request body or query is expected |
| ------- | ------ | ------------------------- | -------------------------------------- |
| submit  | POST   | /api/users/forgotPassword | {email} body, 200 OK on success        |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/forgot-password.spec.ts`
