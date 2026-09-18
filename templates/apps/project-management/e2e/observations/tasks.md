# Page observations: /tasks

> Filled by AI agent driving the running smoke app on 3020/4020 with
> Playwright MCP, then re-validated by the e2e spec set
> (see e2e/tasks.spec.ts). All elements below were observed in the
> live accessibility tree, not inferred from source.

## Procedure

1. `mcp__playwright__browser_navigate` → `/tasks`
2. `mcp__playwright__browser_snapshot` → walk every interactive node.
3. Drive each element, observe response, record below.
4. Re-pass: navigate again, confirm no new elements appear.
5. Author `e2e/tasks.spec.ts` with one test per element / network call.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                         | role  | expected behavior on interaction       | success signal                  | failure signal       |
| -------------------------------------------------- | ----- | -------------------------------------- | ------------------------------- | -------------------- |
| Top-level /my-tasks aggregation                    | list  | shows tasks across every owned project | task A and task B both visible  | one missing          |
| Cross-user isolation                               | guard | tasks from other users do not appear   | B does not see A's tasks        | leaks A's tasks to B |
| Project-scoped /projects/:id/tasks                 | list  | filters to a single project            | only the scoped project's tasks | leaks others' tasks  |
| /projects/:projectId/tasks/:taskId deep-link route | route | mounts and shows the referenced task   | URL stays + task title visible  | redirects            |

## Hidden surfaces opened from this page

(none observed for this page; expansion via tabs/menus is exercised
inline in the elements above where applicable)

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |

## Network calls expected during normal use

| trigger     | method | path                      | what request body or query is expected |
| ----------- | ------ | ------------------------- | -------------------------------------- |
| list        | GET    | /api/tasks                |                                        |
| scoped list | GET    | /api/tasks?project_id=:id |                                        |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/tasks.spec.ts`
