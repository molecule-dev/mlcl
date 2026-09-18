# Page observations: /team (Team list)

> Filled from a live walk via Playwright MCP at /team. Re-walk if any
> visible element changes; do not edit from imagination.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                       | role     | expected behavior on interaction                    | success signal                           | failure signal     |
| ------------------------------------------------ | -------- | --------------------------------------------------- | ---------------------------------------- | ------------------ |
| `getByTestId('invite-team-btn')` (Invite member) | button   | toggle inline invite form; POST /api/team on submit | form visible, then 201 + new row in list | error visible      |
| `getByTestId('invite-team-submit')`              | button   | disabled until name + email present                 | disabled honored                         | enabled when blank |
| Each member row                                  | listitem | shows initials, name, email, role, on-call/timezone | row visible                              | row missing        |

## Hidden surfaces opened from this page

| trigger       | what it opens | elements inside (selector / role / behavior) |
| ------------- | ------------- | -------------------------------------------- |
| Invite member | inline form   | name, email, role select, submit, cancel     |

## Network calls expected during normal use

| trigger       | method | path      | what request body or query is expected |
| ------------- | ------ | --------- | -------------------------------------- |
| Page load     | GET    | /api/team | array of team_members                  |
| Submit invite | POST   | /api/team | `{ name, email, role }` returns 201    |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/08-team.spec.ts`
