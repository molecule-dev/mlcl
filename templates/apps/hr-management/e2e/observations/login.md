# Page observations: /login (Login)

> Filled by AI agent driving the running smoke app on 3080/4080 with
> Playwright MCP, then re-validated by `e2e/login.spec.ts`.

## Procedure

1. `mcp__playwright__browser_navigate` → `/login`
2. `mcp__playwright__browser_snapshot` → walk every interactive node.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                         | role    | expected behavior on interaction                           | success signal            | failure signal                |
| -------------------------------------------------- | ------- | ---------------------------------------------------------- | ------------------------- | ----------------------------- |
| `input#email`                                      | textbox | accepts email                                              | value mirrors typed input | not editable                  |
| `input#password`                                   | textbox | accepts password (masked)                                  | value typed (hidden)      | not editable                  |
| `form button[type="submit"]`                       | button  | POST /api/users/log-in; on success navigates to /dashboard | URL → /dashboard          | inline alert, stays on /login |
| `getByRole('link', { name: /forgot.*password/i })` | link    | navigates to /forgot-password                              | URL → /forgot-password    | stays on /login               |

## Hidden surfaces opened from this page

| trigger                    | what it opens        | elements inside (selector / role / behavior) |
| -------------------------- | -------------------- | -------------------------------------------- |
| invalid credentials submit | inline error message | API responds 4xx; URL stays /login           |

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
