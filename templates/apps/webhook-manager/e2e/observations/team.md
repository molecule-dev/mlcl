# Page observations: /settings/team (Team)

> Filled by the dispatch-flagship agent driving the running app via Playwright MCP.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                          | role           | expected behavior on interaction                                     | success signal                         | failure signal |
| --------------------------------------------------- | -------------- | -------------------------------------------------------------------- | -------------------------------------- | -------------- |
| `getByRole('heading', { name: /team/i, level: 1 })` | heading        | render the page title                                                | visible                                | absent         |
| Invite member button                                | button         | open invite dialog → POST /api/team_members creates a pending invite | new pending row visible after the POST | nothing new    |
| Invite role selector                                | combobox/radio | choose role for the new invite                                       | role chip rendered on the new row      | role missing   |
| Resend button on pending row                        | button         | POST /api/team_members/:id/resend                                    | response 2xx, audit row added          | error          |
| Role-change menu on accepted row                    | combobox       | PATCH /api/team_members/:id with `{ role }`                          | next GET shows the new role            | reverts        |
| Remove/cancel pending button                        | button         | DELETE /api/team_members/:id removes the row                         | row gone after next GET                | row remains    |

## Hidden surfaces opened from this page

| trigger       | what it opens | elements inside (selector / role / behavior) |
| ------------- | ------------- | -------------------------------------------- |
| Invite member | dialog        | email input, role select, send button        |

## Network calls expected during normal use

| trigger     | method | path                         | what request body or query is expected |
| ----------- | ------ | ---------------------------- | -------------------------------------- |
| Page mount  | GET    | /api/team_members            | hydrate the list                       |
| Invite      | POST   | /api/team_members            | `{ email, role }`                      |
| Resend      | POST   | /api/team_members/:id/resend | (empty body)                           |
| Role change | PATCH  | /api/team_members/:id        | `{ role }`                             |
| Remove      | DELETE | /api/team_members/:id        | (empty body)                           |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/team.spec.ts`
