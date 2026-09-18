# Page observations: /executions/:id

> Authenticated run detail. Shows the workflow_run's metadata + each
> workflow_step_run with output/error.

## Page state assumed

- [x] Authenticated (run must exist for this user)

## Elements

| selector / accessible name             | role               | expected behavior on interaction | success signal              | failure signal          |
| -------------------------------------- | ------------------ | -------------------------------- | --------------------------- | ----------------------- |
| `getByRole("heading", { level: 1 })`   | heading            | shows run id or workflow name    | visible                     | empty                   |
| `getByText(/status/i)`                 | label              | renders run status               | visible                     | empty                   |
| `getByText(/step                       | action/i).first()` | label                            | shows at least one step row | visible                 | empty |
| `getByRole("link", { name: /executions | back/i })`         | link                             | back to /executions         | URL becomes /executions | stays |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside |
| ------- | ------------- | --------------- |

## Network calls expected during normal use

| trigger   | method | path          | expected body                                                    |
| --------- | ------ | ------------- | ---------------------------------------------------------------- |
| page load | GET    | /api/runs/:id | { id, workflow_id, status, step_results:[{step_id,output,...}] } |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/08-executiondetail.spec.ts`
