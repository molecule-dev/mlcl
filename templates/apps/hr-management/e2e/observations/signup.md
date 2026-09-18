# Page observations: /signup (Signup)

> Filled by AI agent driving the running smoke app on 3080/4080 with
> Playwright MCP, then re-validated by `e2e/signup.spec.ts`.

## Procedure

1. `mcp__playwright__browser_navigate` → `/signup`
2. `mcp__playwright__browser_snapshot` → walk every interactive node.
3. Drive each element, observe response, record below.
4. Re-pass: navigate again, confirm no new elements appear.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                                                | role    | expected behavior on interaction                                             | success signal                                        | failure signal             |
| ------------------------------------------------------------------------- | ------- | ---------------------------------------------------------------------------- | ----------------------------------------------------- | -------------------------- |
| Signup form (heading + firstName + lastName + email + password + confirm) | form    | accepts all fields; submit POSTs to /api/users                               | URL → /dashboard, access token persisted              | inline alert               |
| Access-token persistence after signup                                     | storage | localStorage `molecule:auth:accessToken` set after register; survives reload | token present after page reload, URL still /dashboard | token missing after reload |
| `form button[type="submit"]` (mismatched passwords)                       | button  | empty/mismatch DOES NOT POST; inline `role="alert"` is shown                 | alert visible, no POST                                | POST fired                 |
| `getByRole('link', { name: /sign in/i })`                                 | link    | navigates to /login                                                          | URL → /login                                          | stays on /signup           |

## Hidden surfaces opened from this page

| trigger                     | what it opens             | elements inside (selector / role / behavior)       |
| --------------------------- | ------------------------- | -------------------------------------------------- |
| password mismatch on submit | inline `role="alert"` div | text "Passwords do not match." — no API call fired |

## Network calls expected during normal use

| trigger      | method | path       | what request body or query is expected   |
| ------------ | ------ | ---------- | ---------------------------------------- |
| valid submit | POST   | /api/users | { firstName, lastName, email, password } |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/signup.spec.ts`
