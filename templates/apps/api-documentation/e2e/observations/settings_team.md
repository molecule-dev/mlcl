# Page observations: /settings/team (Team)

Source: live walk via Playwright + e2e/settings_team.spec.ts. Each row maps to
an element exercised by a passing test that asserts on the real outcome
(network call, navigation, or DOM state change).

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                                     | role    | expected behavior on interaction                                | success signal              | failure signal       |
| -------------------------------------------------------------- | ------- | --------------------------------------------------------------- | --------------------------- | -------------------- |
| `getByRole("heading", { name: /Workspace members/i })`         | heading | team page renders + GET /api/team_members fires                 | heading visible + GET fires | GET fails            |
| `getByRole("textbox", { name: /colleague@yourcompany.com/i })` | textbox | enter invitee email                                             | value reflected             | not editable         |
| `getByRole("button", { name: /Send invite/i })`                | button  | submit POST /api/team_members → invitee appears in pending list | POST + email in pending     | POST fails or no row |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | —             | —                                            |

## Network calls expected during normal use

| trigger       | method | path              | what request body or query is expected          |
| ------------- | ------ | ----------------- | ----------------------------------------------- |
| initial load  | GET    | /api/team_members | 200 with array of members                       |
| submit invite | POST   | /api/team_members | {team_id,email,role} body — 201 with member row |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/settings_team.spec.ts`
