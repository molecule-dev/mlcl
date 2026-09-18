# Page observations: /reset-password (ResetPassword)

> Filled by the dispatch-flagship agent driving the running app via Playwright MCP.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name          | role               | expected behavior on interaction | success signal                        | failure signal  |
| ----------------------------------- | ------------------ | -------------------------------- | ------------------------------------- | --------------- |
| `#fld-password`                     | textbox (password) | accepts new password             | value updates                         | no update       |
| `#fld-confirm-password`             | textbox (password) | accepts confirmation             | value updates                         | no update       |
| `getByRole("button", { name: /reset | submit/i })`       | button                           | POST /users/reset-password with token | redirect /login | inline error |
| mismatch error                      | alert              | shown when passwords differ      | visible                               | missing         |
| back-to-sign-in link                | link               | navigates to /login              | URL is /login                         | no navigation   |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | (none)        | (none)                                       |

## Network calls expected during normal use

| trigger      | method | path                      | what request body or query is expected |
| ------------ | ------ | ------------------------- | -------------------------------------- |
| submit reset | POST   | /api/users/reset-password | { token, password }                    |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/resetpassword.spec.ts`
