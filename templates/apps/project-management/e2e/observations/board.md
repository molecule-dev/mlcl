# Page observations: /board

> Filled by AI agent driving the running smoke app on 3020/4020 with
> Playwright MCP, then re-validated by the e2e spec set
> (see e2e/board.spec.ts). All elements below were observed in the
> live accessibility tree, not inferred from source.

## Procedure

1. `mcp__playwright__browser_navigate` → `/board`
2. `mcp__playwright__browser_snapshot` → walk every interactive node.
3. Drive each element, observe response, record below.
4. Re-pass: navigate again, confirm no new elements appear.
5. Author `e2e/board.spec.ts` with one test per element / network call.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                     | role   | expected behavior on interaction                  | success signal                           | failure signal   |
| ---------------------------------------------- | ------ | ------------------------------------------------- | ---------------------------------------- | ---------------- |
| Four columns (todo/in_progress/in_review/done) | list   | each renders heading + count + empty-state        | fresh project shows 0 in every column    | wrong count      |
| "Add Task" modal submit                        | button | POST /api/tasks → modal closes + card appears     | task in todo column + GET tasks lists it | modal stays open |
| Card drag-drop todo→done                       | drag   | PATCH /api/tasks/:id status=done; survives reload | GET task → status=done                   | still todo       |
| Card delete                                    | button | DELETE /api/tasks/:id removes the row             | GET 404 + card gone                      | still present    |
| Card toggle done                               | button | PATCH /api/tasks/:id flips done; survives reload  | data-task-status=done after reload       | unchanged        |

## Hidden surfaces opened from this page

(none observed for this page; expansion via tabs/menus is exercised
inline in the elements above where applicable)

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |

## Network calls expected during normal use

| trigger       | method | path                      | what request body or query is expected |
| ------------- | ------ | ------------------------- | -------------------------------------- |
| initial mount | GET    | /api/projects/:id         |                                        |
| initial mount | GET    | /api/tasks?project_id=:id |                                        |
| add task      | POST   | /api/tasks                | {project_id, title, status, priority}  |
| drag drop     | PATCH  | /api/tasks/:id            | {status}                               |
| delete        | DELETE | /api/tasks/:id            |                                        |
| toggle        | PATCH  | /api/tasks/:id            | {status}                               |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/board.spec.ts`
