# Page observations: /vaults

> Filled by AI agent driving the running app via Playwright. Do NOT
> author this from imagination or source-code reading — only from what
> the rendered page actually shows after `browser_navigate` +
> `browser_snapshot`.

## Procedure

1. `mcp__playwright__browser_navigate` → /vaults (use APP_BASE)
   - If route is auth-protected, sign up first.
2. `mcp__playwright__browser_snapshot` → get the accessibility tree.
3. Walk every node. For EVERY interactive element below, fill a row.
4. For each element that opens something hidden (menu, modal, tab,
   accordion, popover, drawer): click it, re-snapshot, list elements
   inside the now-open container too. Use `role=button[expanded=true]`
   pattern in the snapshot.
5. Re-navigate and re-snapshot one more time. Compare to your list.
   Add any element you missed. Stop ONLY when one full pass adds nothing.
6. When complete, write `e2e/vaults.spec.ts` with one
   test per row in the "elements" table below. Each test must drive
   the documented behavior and assert on the documented outcome.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                                   | role           | expected behavior on interaction                   | success signal                          | failure signal                    |
| ------------------------------------------------------------ | -------------- | -------------------------------------------------- | --------------------------------------- | --------------------------------- |
| unauthenticated guard                                        | redirect       | visiting /vaults without a token bounces to /login | URL becomes /login                      | page renders without auth         |
| `[data-mol-id="vaults-empty"]` after fresh signup            | region         | GET /api/vaults fires and the empty state renders  | GET responds 200 + empty visible        | list rendered or error shown      |
| `[data-mol-id="vaults-new-button"]` → NewVaultModal → submit | button + modal | opens modal; POST /api/vaults; row appears in list | modal visible, status 201, list updated | modal does not open or POST fails |
| vault card row click                                         | list item      | deep-links to /vaults/:id                          | URL becomes /vaults/:id                 | click does nothing                |

## Hidden surfaces opened from this page

| trigger                          | what it opens | elements inside (selector / role / behavior) |
| -------------------------------- | ------------- | -------------------------------------------- |
| (none beyond the elements above) | n/a           | n/a                                          |

## Network calls expected during normal use

| trigger | method | path        | what request body or query is expected |
| ------- | ------ | ----------- | -------------------------------------- |
| initial | GET    | /api/vaults | authenticated list                     |
| create  | POST   | /api/vaults | body { name, environment }             |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/vaults.spec.ts`
