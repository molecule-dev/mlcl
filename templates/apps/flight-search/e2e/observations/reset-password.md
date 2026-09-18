# Page observations: /reset-password

> Filled by AI agent via Playwright MCP. Validated by
> `e2e/reset-password.spec.ts`.

## Procedure

1. `mcp__playwright__browser_navigate` → `/reset-password?token=tok&email=u@x.com`
2. Inspect prefilled fields.
3. Submit mismatched passwords → expect inline error.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                   | role               | expected behavior on interaction       | success signal                                  | failure signal          |
| -------------------------------------------- | ------------------ | -------------------------------------- | ----------------------------------------------- | ----------------------- |
| `input[type="email"]` + `input[type="text"]` | textbox            | prefilled from `?email=` and `?token=` | values match query params                       | empty                   |
| `input[type="password"]` (×2)                | textbox (password) | new password + confirm                 | inline "Passwords do not match" when mismatched | submit accepts mismatch |
| `a[href="/login"]`                           | link               | routes to /login                       | URL ends /login                                 | no nav                  |

## Hidden surfaces opened from this page

(none)

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |

## Network calls expected during normal use

| trigger | method | path                      | what request body or query is expected |
| ------- | ------ | ------------------------- | -------------------------------------- |
| submit  | POST   | /api/users/reset-password | { token, email, password }             |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/reset-password.spec.ts`
