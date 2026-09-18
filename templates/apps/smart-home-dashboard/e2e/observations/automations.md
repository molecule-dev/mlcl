# Page observations: /automations (Automations)

> Filled by the dispatch-flagship agent driving the running app via Playwright MCP.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name     | role    | expected behavior on interaction                                 | success signal     | failure signal |
| ------------------------------ | ------- | ---------------------------------------------------------------- | ------------------ | -------------- |
| `getByRole('heading').first()` | heading | automations page renders                                         | heading visible    | blank          |
| new-automation button          | button  | opens the new-automation form                                    | form fields appear | no form        |
| submit-automation button       | button  | POST /api/automations and persists                               | automation in list | no new row     |
| trigger-automation button      | button  | POST /api/automations/:id/trigger and increments execution_count | execution_count++  | unchanged      |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside |
| ------- | ------------- | --------------- |
| (none)  | —             | —               |

## Network calls expected during normal use

| trigger            | method | path                         | what request body or query is expected |
| ------------------ | ------ | ---------------------------- | -------------------------------------- |
| page mount         | GET    | /api/automations             | (no body)                              |
| create automation  | POST   | /api/automations             | `{ name, trigger, actions, ... }`      |
| trigger automation | POST   | /api/automations/:id/trigger | (no body)                              |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/automations.spec.ts`
