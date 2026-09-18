# Page observations: /reset-password (ResetPassword)

> Filled by the dispatch-flagship agent driving the running app via Playwright MCP.

## Page state assumed

- [x] Public (no auth required) — token comes from a previous forgot-password email

## Elements

| selector / accessible name                        | role            | expected behavior on interaction             | success signal                                    | failure signal              |
| ------------------------------------------------- | --------------- | -------------------------------------------- | ------------------------------------------------- | --------------------------- |
| Password + confirm fields                         | textbox group   | accept matching new password values          | both inputs accept text and a mismatch is flagged | mismatch error not surfaced |
| `getByRole('button', { name: /reset/i })`         | button (submit) | POST /api/reset_password with token+password | server returns 200 on valid token, 400 on invalid | unhandled errors            |
| Direct API contract on the reset_password handler | network         | reject malformed / forged tokens with 400    | 400 returned with `error` body                    | accepts forged tokens       |

## Hidden surfaces opened from this page

| trigger                 | what it opens | elements inside (selector / role / behavior) |
| ----------------------- | ------------- | -------------------------------------------- |
| (invalid/missing token) | inline error  | text "invalid or expired" message visible    |

## Network calls expected during normal use

| trigger           | method | path                | what request body or query is expected |
| ----------------- | ------ | ------------------- | -------------------------------------- |
| Submit reset form | POST   | /api/reset_password | `{ token, password }` JSON             |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/reset-password.spec.ts`
