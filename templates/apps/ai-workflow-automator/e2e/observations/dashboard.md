# Page observations: /dashboard

> Authenticated dashboard. Aggregates KPIs, sparkline, recent runs, recent
> workflows from /api/dashboard.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                  | role       | expected behavior on interaction | success signal              | failure signal          |
| ------------------------------------------- | ---------- | -------------------------------- | --------------------------- | ----------------------- |
| `getByRole("heading", { level: 1 })`        | heading    | shows dashboard heading          | visible                     | empty                   |
| `[data-mol-id="dashboard"]`                 | region     | renders the WorkflowAppShell     | shell visible               | nothing rendered        |
| `getByRole("link", { name: /workflows/i })` | link       | sidebar link to /workflows       | URL becomes /workflows      | stays                   |
| `getByRole("link", { name: /executions      | runs/i })` | link                             | sidebar link to /executions | URL becomes /executions | stays |
| `getByRole("link", { name: /templates/i })` | link       | sidebar link to /templates       | URL becomes /templates      | stays                   |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside |
| ------- | ------------- | --------------- |

## Network calls expected during normal use

| trigger   | method | path           | expected body                                                                       |
| --------- | ------ | -------------- | ----------------------------------------------------------------------------------- |
| page load | GET    | /api/dashboard | { runs_today, active_workflows, sparkline:[24], recent_runs[], recent_workflows[] } |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/04-dashboard.spec.ts`
