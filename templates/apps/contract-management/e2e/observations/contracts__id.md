# Page observations: /contracts/:id (ContractDetail)

> Filled by AI agent driving the running app via Playwright. Do NOT
> author this from imagination or source-code reading — only from what
> the rendered page actually shows after `browser_navigate` +
> `browser_snapshot`.

## Procedure

1. `mcp__playwright__browser_navigate` → `/contracts/:id` (use APP_BASE)
   - If route is auth-protected, sign up first.
2. `mcp__playwright__browser_snapshot` → get the accessibility tree.
3. Walk every node. For EVERY interactive element below, fill a row.
4. For each element that opens something hidden (menu, modal, tab,
   accordion, popover, drawer): click it, re-snapshot, list elements
   inside the now-open container too. Use `role=button[expanded=true]`
   pattern in the snapshot.
5. Re-navigate and re-snapshot one more time. Compare to your list.
   Add any element you missed. Stop ONLY when one full pass adds nothing.
6. When complete, write `e2e/contracts__id.spec.ts` with one
   test per row in the "elements" table below. Each test must drive
   the documented behavior and assert on the documented outcome.

## Page state assumed

- [ ] Public (no auth required), OR
- [ ] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                         | role   | expected behavior on interaction | success signal                        | failure signal                        |
| -------------------------------------------------- | ------ | -------------------------------- | ------------------------------------- | ------------------------------------- |
| _example: `getByRole('button', { name: 'Save' })`_ | button | submits form, POST /api/posts    | toast "Saved", redirect to /posts/:id | toast "Could not save", stays on form |

(add one row per element observed)

## Hidden surfaces opened from this page

(list each menu/modal/tab/etc. and what's inside; one row each)

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |

## Network calls expected during normal use

| trigger | method | path | what request body or query is expected |
| ------- | ------ | ---- | -------------------------------------- |

## Coverage check (final pass)

- [ ] I navigated, snapshotted, listed, then re-navigated and re-listed
- [ ] One full re-pass added nothing new
- [ ] Every menu/modal/tab/accordion was opened and its contents observed
- [ ] Every form has every field documented (name + type + validation)
- [ ] Every link href / route destination is documented
- [ ] Every dynamic element (loading/empty/error/populated states) is observed
- [ ] All elements above have a corresponding test in `e2e/contracts__id.spec.ts`
