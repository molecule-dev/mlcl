# Page observations: /reset-password (Reset password (/reset-password?token=…))

> Filled by AI agent driving the running app via Playwright. Do NOT
> author this from imagination or source-code reading — only from what
> the rendered page actually shows after `browser_navigate` +
> `browser_snapshot`.

## Procedure

1. `mcp__playwright__browser_navigate` → `/reset-password` (use APP_BASE)
   - If route is auth-protected, sign up first.
2. `mcp__playwright__browser_snapshot` → get the accessibility tree.
3. Walk every node. For EVERY interactive element below, fill a row.
4. For each element that opens something hidden (menu, modal, tab,
   accordion, popover, drawer): click it, re-snapshot, list elements
   inside the now-open container too. Use `role=button[expanded=true]`
   pattern in the snapshot.
5. Re-navigate and re-snapshot one more time. Compare to your list.
   Add any element you missed. Stop ONLY when one full pass adds nothing.
6. When complete, write `e2e/reset-password.spec.ts` with one
   test per row in the "elements" table below. Each test must drive
   the documented behavior and assert on the documented outcome.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                         | role    | expected behavior on interaction | success signal               | failure signal                          |
| -------------------------------------------------- | ------- | -------------------------------- | ---------------------------- | --------------------------------------- |
| `getByLabel(/^new password$/i)`                    | textbox | collects new password            | value typed (masked)         | empty rejected                          |
| `getByLabel(/confirm new password/i)`              | textbox | must match new password          | matches                      | mismatch shows "Passwords do not match" |
| `getByRole('button', { name: /reset password/i })` | button  | POST /api/users/reset-password   | success card; link to /login | inline error from API surfaces          |
| `getByRole('link', { name: /back to sign in/i })`  | link    | navigates to /login              | URL becomes /login           | no nav                                  |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |

## Network calls expected during normal use

| trigger     | method | path                      | what request body or query is expected |
| ----------- | ------ | ------------------------- | -------------------------------------- |
| submit form | POST   | /api/users/reset-password | { token, password }                    |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/reset-password.spec.ts`
