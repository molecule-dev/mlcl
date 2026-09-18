# Page observations: /projects/:id/states (StateMachine)

> Filled by AI agent driving the running app via Playwright. Rows
> reflect real elements observed via `browser_navigate` after creating
> a project.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`); project created beforehand

## Elements

| selector / accessible name                                   | role    | expected behavior on interaction           | success signal                            | failure signal  |
| ------------------------------------------------------------ | ------- | ------------------------------------------ | ----------------------------------------- | --------------- |
| `getByRole('heading', { name: /State machine/i, level: 1 })` | heading | render state-machine heading               | visible                                   | absent          |
| timeline view tab "timeline"                                 | button  | switch view to timeline                    | data-mol-view changes                     | view unchanged  |
| states view tab "states"                                     | button  | switch view to states                      | data-mol-view changes                     | view unchanged  |
| `getByRole('button', { name: /Add state/i })`                | button  | POST /api/states; new state shown in panel | GET /api/states?projectId returns new row | nothing changes |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | (none)        | (none)                                       |

## Network calls expected during normal use

| trigger         | method | path              | what request body or query is expected |
| --------------- | ------ | ----------------- | -------------------------------------- |
| page load       | GET    | /api/projects/:id | (none)                                 |
| page load       | GET    | /api/states       | ?projectId=:id                         |
| Add state click | POST   | /api/states       | { projectId, name }                    |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/projects__id_states.spec.ts`
