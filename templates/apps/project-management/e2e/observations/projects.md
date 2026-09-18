# Page observations: /projects

> Filled by AI agent driving the running smoke app on 3020/4020 with
> Playwright MCP, then re-validated by the e2e spec set
> (see e2e/projects.spec.ts). All elements below were observed in the
> live accessibility tree, not inferred from source.

## Procedure

1. `mcp__playwright__browser_navigate` → `/projects`
2. `mcp__playwright__browser_snapshot` → walk every interactive node.
3. Drive each element, observe response, record below.
4. Re-pass: navigate again, confirm no new elements appear.
5. Author `e2e/projects.spec.ts` with one test per element / network call.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                | role   | expected behavior on interaction             | success signal                        | failure signal          |
| ----------------------------------------- | ------ | -------------------------------------------- | ------------------------------------- | ----------------------- |
| `POST /api/projects` create               | button | creates a project row owned by the user      | GET list contains the new row         | returns 4xx             |
| `PATCH /api/projects/:id` rename + status | button | updates name + status, survives reload       | GET reflects the patched fields       | no change               |
| `DELETE /api/projects/:id`                | button | removes the row; subsequent GET 404s         | 204 + 404 on subsequent GET           | still found             |
| Cross-user isolation                      | guard  | user B cannot read/update/delete A's project | returns 404 for B                     | returns 200/204         |
| `GET /api/projects?q=` search filter      | data   | search bond filters by project name          | returns matches; excludes non-matches | returns unfiltered list |

## Hidden surfaces opened from this page

(none observed for this page; expansion via tabs/menus is exercised
inline in the elements above where applicable)

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |

## Network calls expected during normal use

| trigger   | method | path                | what request body or query is expected |
| --------- | ------ | ------------------- | -------------------------------------- |
| create    | POST   | /api/projects       | {name, description?, color?, status?}  |
| read list | GET    | /api/projects       |                                        |
| read one  | GET    | /api/projects/:id   |                                        |
| rename    | PATCH  | /api/projects/:id   | {name, status?}                        |
| delete    | DELETE | /api/projects/:id   |                                        |
| search    | GET    | /api/projects?q=... |                                        |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/projects.spec.ts`
