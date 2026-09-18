# Page observations: /login

> Filled by AI agent driving the running smoke app via Playwright MCP.
> Validated by `e2e/login.spec.ts`.

## Procedure

1. `mcp__playwright__browser_navigate` → `/login`
2. Snapshot, fill credentials, observe redirect.
3. Probe error path with bad password.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name   | role               | expected behavior on interaction | success signal            | failure signal            |
| ---------------------------- | ------------------ | -------------------------------- | ------------------------- | ------------------------- |
| `input[type="email"]`        | textbox (email)    | accepts email                    | value persists            | required-validation toast |
| `input[type="password"]`     | textbox (password) | accepts password, masks chars    | type=password             | accepts plain text        |
| `form button[type="submit"]` | button             | POST /api/users/log-in → /search | URL ends /search          | stays on /login           |
| `a[href="/forgot-password"]` | link               | routes to /forgot-password       | URL ends /forgot-password | stays on /login           |

## Hidden surfaces opened from this page

(none)

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |

## Network calls expected during normal use

| trigger | method | path              | what request body or query is expected |
| ------- | ------ | ----------------- | -------------------------------------- |
| submit  | POST   | /api/users/log-in | { email, password }                    |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/login.spec.ts`
