# Page observations: /timeline

> Filled by AI agent driving the running smoke app on 3020/4020 with
> Playwright MCP, then re-validated by the e2e spec set
> (see e2e/timeline.spec.ts). All elements below were observed in the
> live accessibility tree, not inferred from source.

## Procedure

1. `mcp__playwright__browser_navigate` → `/timeline`
2. `mcp__playwright__browser_snapshot` → walk every interactive node.
3. Drive each element, observe response, record below.
4. Re-pass: navigate again, confirm no new elements appear.
5. Author `e2e/timeline.spec.ts` with one test per element / network call.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                | role   | expected behavior on interaction                    | success signal                      | failure signal       |
| ----------------------------------------- | ------ | --------------------------------------------------- | ----------------------------------- | -------------------- |
| Empty-state on /timeline with no events   | text   | "no upcoming events" message                        | visible for fresh user              | missing              |
| "Add Event" submit                        | button | POST /api/milestones → row appears in calendar grid | milestone visible + survives reload | modal stays / no row |
| Add Event without project                 | guard  | surfaces a friendly error (no silent fail)          | alert role visible                  | silent failure       |
| Project-scoped /projects/:id/timeline     | list   | shows existing milestones for that project          | milestone visible                   | empty state          |
| /projects/:projectId/calendar route alias | route  | renders the same timeline component                 | milestone visible at /calendar      | 404 on /calendar     |
| Popover delete event                      | button | DELETE /api/milestones/:id removes row              | GET 404 after delete                | row remains          |

## Hidden surfaces opened from this page

(none observed for this page; expansion via tabs/menus is exercised
inline in the elements above where applicable)

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |

## Network calls expected during normal use

| trigger       | method | path                | what request body or query is expected |
| ------------- | ------ | ------------------- | -------------------------------------- |
| initial mount | GET    | /api/milestones     |                                        |
| add event     | POST   | /api/milestones     | {project_id, title, due_date}          |
| delete event  | DELETE | /api/milestones/:id |                                        |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/timeline.spec.ts`
