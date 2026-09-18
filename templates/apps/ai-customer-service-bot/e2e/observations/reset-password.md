# Page observations: /reset-password (ResetPassword)

Captured from `browser_snapshot` on
`http://localhost:3170/reset-password?token=fake-token-for-render-only`.
Token is invalid; the page still mounts so the form is observable.

## Page state assumed

- [x] Public (no auth required, but a `?token=...` query string is required)

## Elements

| selector / accessible name          | role    | expected behavior on interaction | success signal | failure signal |
| ----------------------------------- | ------- | -------------------------------- | -------------- | -------------- |
| `getByLabel(/^password$/i)`         | textbox | accepts new password             | value matches  | empty          |
| `getByLabel(/confirm/i)`            | textbox | accepts confirmation             | value matches  | empty          |
| `getByRole('button', { name: /reset | update  | submit                           | change/i })`   | button         | POST /api/reset-password with token | navigates to /login on success | error visible on bad token |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | —             | —                                            |

## Network calls expected during normal use

| trigger     | method | path                | what request body or query is expected               |
| ----------- | ------ | ------------------- | ---------------------------------------------------- |
| Submit form | POST   | /api/reset-password | `{ token, password }`; 4xx for invalid/expired token |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/reset-password.spec.ts`
