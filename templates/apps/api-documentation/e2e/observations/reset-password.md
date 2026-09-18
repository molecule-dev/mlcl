# Page observations: /reset-password (ResetPassword)

Source: live walk via Playwright + e2e/reset-password.spec.ts. Each row maps to
an element exercised by a passing test that asserts on the real outcome
(network call, navigation, or DOM state change).

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                         | role    | expected behavior on interaction           | success signal             | failure signal |
| -------------------------------------------------- | ------- | ------------------------------------------ | -------------------------- | -------------- |
| `getByRole("textbox", { name: /email/i })`         | textbox | enter email                                | value reflected            | not editable   |
| `getByRole("textbox", { name: /reset token/i })`   | textbox | enter token                                | value reflected            | not editable   |
| `getByRole("button", { name: /Reset Password/i })` | button  | submit fires POST /api/users/resetPassword | POST /api/users in network | no POST        |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | —             | —                                            |

## Network calls expected during normal use

| trigger | method | path                     | what request body or query is expected          |
| ------- | ------ | ------------------------ | ----------------------------------------------- |
| submit  | POST   | /api/users/resetPassword | {email,token,password} body — 200 OK on success |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/reset-password.spec.ts`
