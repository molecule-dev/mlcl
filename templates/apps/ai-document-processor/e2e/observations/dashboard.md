# Page observations: /dashboard (Dashboard)

> Authenticated landing surface. On mount: GET /api/reports/dashboard_stats
>
> - GET /api/documents in parallel. Renders KPI tiles (Pending review,
>   Avg accuracy, etc.), DocumentTypeBreakdown, and a recent-documents
>   table. Uploaded docs show up here within seconds of being processed.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                              | role    | expected behavior on interaction           | success signal          | failure signal |
| ------------------------------------------------------- | ------- | ------------------------------------------ | ----------------------- | -------------- |
| `[data-mol-id="dashboard-page"]`                        | region  | renders dashboard container                | visible                 | hidden         |
| `getByRole('heading', { level: 1 })`                    | heading | renders welcome / overview headline        | visible                 | empty          |
| `getByText(/pending review/i).first()`                  | text    | renders Pending Review KPI tile            | numeric/zero visible    | absent         |
| `getByRole('heading', { name: /recent.*documents/i })`  | heading | renders Recent documents section           | visible                 | absent         |
| `getByRole('link', { name: /view all/i })`              | link    | nav to /documents                          | URL becomes /documents  | stays          |
| `[data-mol-id="dashboard-page"] a[href^="/documents/"]` | link    | row link to document detail (after upload) | href starts /documents/ | absent         |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside |
| ------- | ------------- | --------------- |

## Network calls expected during normal use

| trigger   | method | path                         | expected body          |
| --------- | ------ | ---------------------------- | ---------------------- |
| Page load | GET    | /api/reports/dashboard_stats | KPIs object            |
| Page load | GET    | /api/documents               | recent documents array |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/05-dashboard.spec.ts`
