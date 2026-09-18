# Page observations: analytics

> Walked via the running app on VITE_PORT=3100 / API_PORT=4100. Covers
> the `/analytics` dashboard's KPI cards and project breakdown.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name            | role      | expected behavior on interaction                                               | success signal                                 | failure signal                 |
| ------------------------------------- | --------- | ------------------------------------------------------------------------------ | ---------------------------------------------- | ------------------------------ |
| `getByText(/total/i                   | this week | overdue                                                                        | completion rate/i)`on`/analytics`              | text                           | Renders the four KPI cards (Total, This Week, Overdue, Completion Rate) | All four labels visible within 15s | Any KPI missing or page error |
| Completion-rate KPI value             | text      | Reflects (completed / total) on render; updates after marking complete via API | After 1-of-2 completed: shows `50%` within 15s | Stays `0%` / wrong percentage  |
| Project breakdown row on `/analytics` | text      | Lists every project the user owns with task counts                             | Newly-created project name visible             | Project missing from breakdown |

## Hidden surfaces opened from this page

| trigger                       | what it opens                | elements inside (selector / role / behavior) |
| ----------------------------- | ---------------------------- | -------------------------------------------- |
| Click a project breakdown row | navigates to `/projects/:id` | project header + task list                   |

## Network calls expected during normal use

| trigger   | method | path          | what request body or query is expected |
| --------- | ------ | ------------- | -------------------------------------- |
| Page load | GET    | /api/tasks    | → 200 (used to compute KPIs)           |
| Page load | GET    | /api/projects | → 200 (used for project breakdown)     |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/09-analytics.spec.ts`
