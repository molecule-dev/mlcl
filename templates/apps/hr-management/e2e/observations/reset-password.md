# Page observations: /reset-password (ResetPassword)

> Filled by AI agent driving the running smoke app on 3080/4080 with
> Playwright MCP, then re-validated by `e2e/reset-password.spec.ts`.

## Procedure

1. `mcp__playwright__browser_navigate` → `/reset-password?token=…`
2. `mcp__playwright__browser_snapshot` → walk every interactive node.

## Page state assumed

- [x] Public (no auth required) — page is reached via token-bearing email link

## Elements

| selector / accessible name                          | role   | expected behavior on interaction                                 | success signal                                               | failure signal |
| --------------------------------------------------- | ------ | ---------------------------------------------------------------- | ------------------------------------------------------------ | -------------- |
| New-password form (heading + password + confirm)    | form   | static rendering                                                 | all three visible                                            | any missing    |
| `form button[type="submit"]` (mismatched passwords) | button | inline `role="alert"` div appears, no POST is fired              | alert visible, no POST                                       | POST fired     |
| `form button[type="submit"]` (matching passwords)   | button | POST /api/users/reset-password via usePasswordReset.confirmReset | POST observed (status surfaced regardless of token validity) | no POST        |

## Hidden surfaces opened from this page

| trigger                     | what it opens                | elements inside (selector / role / behavior)       |
| --------------------------- | ---------------------------- | -------------------------------------------------- |
| password mismatch on submit | inline `role="alert"` div    | text "Passwords do not match." — no API call fired |
| successful submit           | inline `role="status"` block | "Password updated." + Sign-in CTA → /login         |

## Network calls expected during normal use

| trigger           | method | path                      | what request body or query is expected |
| ----------------- | ------ | ------------------------- | -------------------------------------- |
| submit (matching) | POST   | /api/users/reset-password | { token, password }                    |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/reset-password.spec.ts`
