# Page observations: /reset-password (ResetPassword)

> Filled by AI agent driving the running app via Playwright.

## Page state assumed

- [x] Public (no auth required, but expects `?token=...` query parameter for the happy path)

## Elements

| selector / accessible name                              | role    | expected behavior on interaction                                                                                                           | success signal                                           | failure signal         |
| ------------------------------------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------- | ---------------------- |
| `getByRole('heading', { name: /Set a new password/i })` | heading | page heading renders                                                                                                                       | heading visible                                          | heading missing        |
| `getByLabel(/^New password$/i)`                         | textbox | accepts new password (min 8 chars)                                                                                                         | retains the typed value, masked                          | input not masked       |
| `getByLabel(/Confirm password/i)`                       | textbox | accepts confirmation                                                                                                                       | retains the typed value, masked                          | input not masked       |
| `getByRole('button', { name: /Reset password/i })`      | button  | with no token shows "Invalid or expired" alert; with mismatched passwords shows mismatch alert; with valid token POSTs `/api/users/log-in` | error alert visible OR navigation to `/login` on success | submit silently no-ops |
| `getByRole('link', { name: /Back to sign in/i })`       | link    | navigates to `/login`                                                                                                                      | URL becomes `/login`                                     | URL unchanged          |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | —             | —                                            |

## Network calls expected during normal use

| trigger                            | method | path              | what request body or query is expected                     |
| ---------------------------------- | ------ | ----------------- | ---------------------------------------------------------- |
| Reset password submit (with token) | POST   | /api/users/log-in | `{ passwordResetToken, password }` → 200 if token is valid |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/reset-password.spec.ts`
