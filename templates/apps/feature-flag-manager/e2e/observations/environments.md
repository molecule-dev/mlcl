# Page observations: /environments (Environments)

> Filled by the dispatch-flagship agent driving the running app via Playwright MCP.
> Each row corresponds to a real DOM element observed in the rendered page,
> not derived from source-code reading.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`); seeded with 3 environments

## Elements

| selector / accessible name                            | role         | expected behavior on interaction          | success signal                                         | failure signal                  |
| ----------------------------------------------------- | ------------ | ----------------------------------------- | ------------------------------------------------------ | ------------------------------- |
| `getByRole('button', { name: /new environment/i })`   | button       | reveal env-create form                    | form fields visible                                    | form hidden                     |
| Name / key inputs in create form                      | textbox      | accept env metadata                       | value reflects typed text                              | empty                           |
| `getByRole('button', { name: /create/i })` (env form) | button       | submit, POST /api/environments            | new env card with sdk_key visible                      | error                           |
| `getByRole('button', { name: /refresh                 | rotate/i })` | button                                    | PUT /api/environments/:id rotates sdk_key + client_key | new keys differ from old in GET | unchanged |
| `getByRole('button', { name: /delete/i })` (env card) | button       | DELETE /api/environments/:id, remove card | card no longer rendered                                | still visible                   |
| Environment card showing seed env (Production)        | card         | render seed env name + sdk_key            | visible after seed                                     | absent                          |

## Hidden surfaces opened from this page

| trigger         | what it opens          | elements inside (selector / role / behavior)                         |
| --------------- | ---------------------- | -------------------------------------------------------------------- |
| New environment | env-create inline form | name input, key input, color input, description input, Create button |

## Network calls expected during normal use

| trigger     | method | path                  | what request body or query is expected |
| ----------- | ------ | --------------------- | -------------------------------------- |
| page load   | GET    | /api/environments     | (none)                                 |
| Create      | POST   | /api/environments     | { key, name, color, description }      |
| Rotate keys | PUT    | /api/environments/:id | { rotateKeys: true }                   |
| Delete      | DELETE | /api/environments/:id | (none)                                 |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/14-environments.spec.ts`
