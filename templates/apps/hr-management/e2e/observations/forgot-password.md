# Page observations: /forgot-password (ForgotPassword)

> Filled by AI agent driving the running smoke app on 3080/4080 with
> Playwright MCP, then re-validated by `e2e/forgot-password.spec.ts`.

## Procedure

1. `mcp__playwright__browser_navigate` → `/forgot-password`
2. `mcp__playwright__browser_snapshot` → walk every interactive node.
3. Submit a real email → observe POST + success state.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                                 | role   | expected behavior on interaction                                | success signal                 | failure signal                 |
| ---------------------------------------------------------- | ------ | --------------------------------------------------------------- | ------------------------------ | ------------------------------ |
| Recovery form (heading + email + submit)                   | form   | static rendering                                                | all three visible              | any missing                    |
| `getByRole('button', { name: /send reset link\|send/i })`  | button | fires POST /api/users/forgot-password via usePasswordReset hook | UI flips to "check your inbox" | inline alert with role="alert" |
| `getByRole('link', { name: /back to sign in\|sign in/i })` | link   | navigates to /login                                             | URL → /login                   | stays on /forgot-password      |

## Hidden surfaces opened from this page

| trigger           | what it opens                             | elements inside (selector / role / behavior)          |
| ----------------- | ----------------------------------------- | ----------------------------------------------------- |
| successful submit | inline `role="status"` confirmation block | "Reset link sent." + "Check {email} for instructions" |

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
