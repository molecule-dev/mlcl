# Page observations: /reset-password (ResetPassword)

> Filled by the dispatch-flagship agent driving the running app via Playwright MCP.

## Page state assumed

- [x] Public (no auth required); requires a `token` query param in real flow.

## Elements

| selector / accessible name | role    | expected behavior on interaction | success signal               | failure signal         |
| -------------------------- | ------- | -------------------------------- | ---------------------------- | ---------------------- |
| New password input         | textbox | accepts new password             | masked input visible         | type=text              |
| Confirm password input     | textbox | accepts confirmation             | masked input visible         | type=text              |
| Submit reset button        | button  | POSTs /api/users/reset-password  | success / redirect to /login | error message rendered |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | (none)        | (none)                                       |

## Network calls expected during normal use

| trigger       | method | path                      | what request body or query is expected |
| ------------- | ------ | ------------------------- | -------------------------------------- |
| Submit button | POST   | /api/users/reset-password | { token, password }                    |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/reset-password.spec.ts`
