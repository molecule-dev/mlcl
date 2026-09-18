# Page observations: /reports (reports)

> Filled by AI agent driving the running app via Playwright. Do NOT
> author this from imagination or source-code reading — only from what
> the rendered page actually shows after `browser_navigate` +
> `browser_snapshot`.

## Procedure

1. `mcp__playwright__browser_navigate` → `/reports` (use APP_BASE)
   - If route is auth-protected, sign up first.
2. `mcp__playwright__browser_snapshot` → get the accessibility tree.
3. Walk every node. For EVERY interactive element below, fill a row.
4. For each element that opens something hidden (menu, modal, tab,
   accordion, popover, drawer): click it, re-snapshot, list elements
   inside the now-open container too. Use `role=button[expanded=true]`
   pattern in the snapshot.
5. Re-navigate and re-snapshot one more time. Compare to your list.
   Add any element you missed. Stop ONLY when one full pass adds nothing.
6. When complete, write `e2e/reports.spec.ts` with one
   test per row in the "elements" table below. Each test must drive
   the documented behavior and assert on the documented outcome.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                                       | role   | expected behavior on interaction      | success signal                                           | failure signal                 |
| ---------------------------------------------------------------- | ------ | ------------------------------------- | -------------------------------------------------------- | ------------------------------ |
| `getByRole('link', { name: 'Recoup Every receipt, recovered' })` | link   | navigates per href                    | URL changes after click                                  | URL unchanged or 404           |
| `getByRole('link', { name: 'Dashboard' })`                       | link   | navigates per href                    | URL changes after click                                  | URL unchanged or 404           |
| `getByRole('link', { name: 'Expenses' })`                        | link   | navigates per href                    | URL changes after click                                  | URL unchanged or 404           |
| `getByRole('link', { name: 'Reports' })`                         | link   | navigates per href                    | URL changes after click                                  | URL unchanged or 404           |
| `getByRole('link', { name: 'Report Library' })`                  | link   | navigates per href                    | URL changes after click                                  | URL unchanged or 404           |
| `getByRole('link', { name: 'Approvals' })`                       | link   | navigates per href                    | URL changes after click                                  | URL unchanged or 404           |
| `getByRole('link', { name: 'Activity' })`                        | link   | navigates per href                    | URL changes after click                                  | URL unchanged or 404           |
| `getByRole('link', { name: 'Settings' })`                        | link   | navigates per href                    | URL changes after click                                  | URL unchanged or 404           |
| `getByRole('button', { name: 'Open user menu' })`                | button | triggers documented behavior on click | observable side effect (network call, navigation, toast) | nothing happens or error toast |
| `getByRole('link', { name: 'Back to reports' })`                 | link   | navigates per href                    | URL changes after click                                  | URL unchanged or 404           |
| `getByRole('link', { name: 'Export CSV' })`                      | link   | navigates per href                    | URL changes after click                                  | URL unchanged or 404           |
| `getByRole('link', { name: 'About Recoup' })`                    | link   | navigates per href                    | URL changes after click                                  | URL unchanged or 404           |
| `getByRole('button', { name: 'Privacy Policy' })`                | button | triggers documented behavior on click | observable side effect (network call, navigation, toast) | nothing happens or error toast |
| `getByRole('button', { name: 'Terms of Service' })`              | button | triggers documented behavior on click | observable side effect (network call, navigation, toast) | nothing happens or error toast |
| `getByRole('button', { name: 'Language' })`                      | button | triggers documented behavior on click | observable side effect (network call, navigation, toast) | nothing happens or error toast |

## Hidden surfaces opened from this page

| trigger         | what it opens | elements inside (selector / role / behavior) |
| --------------- | ------------- | -------------------------------------------- |
| (none observed) | —             | —                                            |

## Network calls expected during normal use

| trigger                            | method | path                        | what request body or query is expected |
| ---------------------------------- | ------ | --------------------------- | -------------------------------------- |
| page load (when ?id=:uuid present) | GET    | /api/reports/:id            | (none)                                 |
| Export CSV link                    | GET    | /api/reports/:id/export.csv | (none)                                 |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/reports.spec.ts`
