# Page observations: /forgot-password

> Filled by AI agent driving the running smoke app via Playwright MCP.
> Validated by `e2e/forgot-password.spec.ts`.

## Procedure

1. `mcp__playwright__browser_navigate` → `/forgot-password`
2. Submit empty + valid email; observe POST + success card.
3. Click "Back to sign in" → /login.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name   | role            | expected behavior on interaction | success signal                 | failure signal |
| ---------------------------- | --------------- | -------------------------------- | ------------------------------ | -------------- |
| `input[type="email"]`        | textbox (email) | accepts email, required          | value persists, required=true  | submit blocked |
| `form button[type="submit"]` | button          | POST /api/users/forgot-password  | "Reset link sent" card visible | error banner   |
| `a[href="/login"]`           | link            | routes to /login                 | URL ends /login                | no nav         |

## Hidden surfaces opened from this page

| trigger           | what it opens       | elements inside (selector / role / behavior)                |
| ----------------- | ------------------- | ----------------------------------------------------------- |
| successful submit | inline success card | `text=/reset link sent/i` heading + email confirmation body |

## Network calls expected during normal use

| trigger | method | path                       | what request body or query is expected |
| ------- | ------ | -------------------------- | -------------------------------------- |
| submit  | POST   | /api/users/forgot-password | { email }                              |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/forgot-password.spec.ts`
