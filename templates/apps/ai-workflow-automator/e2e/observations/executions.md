# Page observations: /executions

> Authenticated runs list. Shows every workflow_run for the active user,
> with status, started_at, finished_at, links into detail.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                  | role    | expected behavior on interaction            | success signal    | failure signal |
| ------------------------------------------- | ------- | ------------------------------------------- | ----------------- | -------------- |
| `getByRole("heading", { level: 1 })`        | heading | page heading visible                        | visible           | empty          |
| `[data-mol-id="executions-table"]`          | table   | shows runs (or "no executions" empty state) | rows or empty msg | nothing        |
| `getByRole("link", { name: /workflows/i })` | link    | sidebar back to /workflows                  | URL changes       | stays          |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside |
| ------- | ------------- | --------------- |

## Network calls expected during normal use

| trigger         | method | path                        | expected body                               |
| --------------- | ------ | --------------------------- | ------------------------------------------- |
| page load       | GET    | /api/runs                   | [ { id, workflow_id, status, started_at } ] |
| pick a workflow | GET    | /api/runs/stats/:workflowId | { total, success, failed, ... }             |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/07-executions.spec.ts`
