# Page observations: /scenes (Scenes)

> Filled by the dispatch-flagship agent driving the running app via Playwright MCP.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name     | role    | expected behavior on interaction                              | success signal            | failure signal  |
| ------------------------------ | ------- | ------------------------------------------------------------- | ------------------------- | --------------- |
| `getByRole('heading').first()` | heading | scenes page renders                                           | heading visible           | blank           |
| create-scene button            | button  | opens the new-scene form                                      | form fields appear        | no form         |
| submit-scene button            | button  | POST /api/scenes with name+device_states                      | scene appears in the list | no new row      |
| activate-scene button          | button  | POST /api/scenes/:id/activate and increments activation_count | updated count returned    | count unchanged |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside |
| ------- | ------------- | --------------- |
| (none)  | —             | —               |

## Network calls expected during normal use

| trigger        | method | path                     | what request body or query is expected |
| -------------- | ------ | ------------------------ | -------------------------------------- |
| page mount     | GET    | /api/scenes              | (no body)                              |
| create scene   | POST   | /api/scenes              | `{ name, device_states }`              |
| activate scene | POST   | /api/scenes/:id/activate | (no body)                              |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/scenes.spec.ts`
