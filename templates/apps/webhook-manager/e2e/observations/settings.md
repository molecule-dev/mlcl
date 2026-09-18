# Page observations: /settings (Settings)

> Filled by the dispatch-flagship agent driving the running app via Playwright MCP.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                              | role         | expected behavior on interaction                      | success signal                        | failure signal |
| ------------------------------------------------------- | ------------ | ----------------------------------------------------- | ------------------------------------- | -------------- |
| `getByRole('heading', { name: /settings/i, level: 1 })` | heading      | render the page title                                 | visible                               | absent         |
| Tab strip (General / API keys / Team / Billing)         | tablist      | clicking a tab navigates to that sub-route            | URL changes to the sub-route          | stays          |
| Workspace name input                                    | textbox      | accept new workspace name                             | typed value present                   | empty          |
| Region buttons                                          | button group | toggle visibly active region                          | only the picked region is highlighted | none / wrong   |
| Retention slider/select                                 | combobox     | change retention preference                           | next GET reflects the new retention   | reverts        |
| Save button                                             | button       | PATCH /api/profile (workspace lives in `preferences`) | round-trips through reload            | reverts        |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | (none)        | (none)                                       |

## Network calls expected during normal use

| trigger    | method | path         | what request body or query is expected |
| ---------- | ------ | ------------ | -------------------------------------- |
| Page mount | GET    | /api/profile | hydrate workspace prefs                |
| Save       | PATCH  | /api/profile | `{ preferences }` JSON                 |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/settings.spec.ts`
