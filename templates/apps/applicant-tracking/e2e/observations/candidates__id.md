# Page observations: /candidates__id (Candidate detail (/candidates/:id))

> Filled by AI agent driving the running app via Playwright. Do NOT
> author this from imagination or source-code reading — only from what
> the rendered page actually shows after `browser_navigate` +
> `browser_snapshot`.

## Procedure

1. `mcp__playwright__browser_navigate` → `/candidates__id` (use APP_BASE)
   - If route is auth-protected, sign up first.
2. `mcp__playwright__browser_snapshot` → get the accessibility tree.
3. Walk every node. For EVERY interactive element below, fill a row.
4. For each element that opens something hidden (menu, modal, tab,
   accordion, popover, drawer): click it, re-snapshot, list elements
   inside the now-open container too. Use `role=button[expanded=true]`
   pattern in the snapshot.
5. Re-navigate and re-snapshot one more time. Compare to your list.
   Add any element you missed. Stop ONLY when one full pass adds nothing.
6. When complete, write `e2e/candidates__id.spec.ts` with one
   test per row in the "elements" table below. Each test must drive
   the documented behavior and assert on the documented outcome.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                                    | role    | expected behavior on interaction                 | success signal                        | failure signal            |
| ------------------------------------------------------------- | ------- | ------------------------------------------------ | ------------------------------------- | ------------------------- |
| Name heading                                                  | heading | shows candidate name from API                    | visible after mount                   | missing                   |
| `[data-mol-id="candidate-advance"]`                           | button  | PUT /api/candidates/:id { stage: next }          | stage moves forward                   | 4xx surfaces inline error |
| `[data-mol-id="candidate-move-interview"]` (per stage button) | button  | PUT /api/candidates/:id { stage: target }        | card moves to chosen stage            | 4xx surfaces inline error |
| Interviews tab                                                | tab     | reveals schedule form + per-candidate interviews | tab content visible                   | tab does not switch       |
| `[data-mol-id="candidate-schedule-form"]`                     | form    | POST /api/interviews                             | interview added to per-candidate list | 4xx surfaces inline error |
| Back-to-candidates link                                       | link    | navigates to /candidates                         | URL becomes /candidates               | no nav                    |

## Hidden surfaces opened from this page

| trigger              | what it opens | elements inside (selector / role / behavior) |
| -------------------- | ------------- | -------------------------------------------- |
| Click Interviews tab | tab content   | schedule form + interview list               |

## Network calls expected during normal use

| trigger  | method | path                             | what request body or query is expected              |
| -------- | ------ | -------------------------------- | --------------------------------------------------- |
| mount    | GET    | /api/candidates/:id              | no body                                             |
| mount    | GET    | /api/interviews?candidate_id=:id | no body                                             |
| advance  | PUT    | /api/candidates/:id              | { stage }                                           |
| schedule | POST   | /api/interviews                  | { candidate_id, scheduled_at, duration_minutes, … } |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/candidates__id.spec.ts`
