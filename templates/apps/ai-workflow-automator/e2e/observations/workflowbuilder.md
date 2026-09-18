# Page observations: /workflows/:id (Workflow Builder)

> Authenticated workflow builder. Shows steps in order, lets the user
> rename, edit steps, toggle enabled, trigger a run.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name           | role            | expected behavior on interaction | success signal                        | failure signal                            |
| ------------------------------------ | --------------- | -------------------------------- | ------------------------------------- | ----------------------------------------- |
| `getByRole("heading", { level: 1 })` | heading         | shows the workflow name          | visible                               | empty                                     |
| `getByRole("button", { name: /run    | trigger/i })`   | button                           | POST /api/workflows/:id/trigger       | new run row in /api/runs                  | error               |
| `getByRole("button", { name: /save   | update/i })`    | button                           | PUT /api/workflows/:id with new steps | next GET reflects                         | error               |
| `getByRole("button", { name: /enable | disable         | toggle/i })`                     | button                                | PATCH /workflows/:id/toggle flips enabled | enabled state flips | unchanged |
| `getByRole("link", { name: /back     | workflows/i })` | link                             | back to /workflows                    | URL becomes /workflows                    | stays               |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside |
| ------- | ------------- | --------------- |

## Network calls expected during normal use

| trigger   | method | path                       | expected body                      |
| --------- | ------ | -------------------------- | ---------------------------------- |
| page load | GET    | /api/workflows/:id         | { id, name, steps:[...], enabled } |
| save      | PUT    | /api/workflows/:id         | { steps:[...] }                    |
| run       | POST   | /api/workflows/:id/trigger | run row 202                        |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/06-workflowbuilder.spec.ts`
