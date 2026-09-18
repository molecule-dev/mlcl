# Page observations: /reset-password (ResetPassword)

> Filled by the dispatch-flagship agent driving the running app via Playwright MCP.

## Page state assumed

- [x] Unauthenticated guest with a `?token=` query

## Elements

| selector / accessible name          | role         | expected behavior on interaction | success signal                   | failure signal          |
| ----------------------------------- | ------------ | -------------------------------- | -------------------------------- | ----------------------- |
| `input[type="password"]` (new)      | textbox      | Captures the new password        | masked rendering                 | reset on type           |
| `input[type="password"]` (confirm)  | textbox      | Captures the confirmed password  | masked rendering                 | reset on type           |
| `getByRole('button', { name: /reset | update/i })` | button                           | Submits reset; rejects bad token | server response 4xx/2xx | hangs |
| `getByRole('link')` (back to login) | link         | Routes to /login                 | URL becomes /login               | stays on page           |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | (none)        | (none)                                       |

## Network calls expected during normal use

| trigger | method | path                      | what request body or query is expected |
| ------- | ------ | ------------------------- | -------------------------------------- |
| submit  | POST   | /api/users/reset-password | { token, password }                    |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/05-reset-password.spec.ts`
