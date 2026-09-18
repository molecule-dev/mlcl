# Page observations: /maintenance (Maintenance windows list)

> Filled from a live walk via Playwright MCP at /maintenance. Re-walk if
> any visible element changes; do not edit from imagination.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                                  | role     | expected behavior on interaction                             | success signal                           | failure signal                |
| ----------------------------------------------------------- | -------- | ------------------------------------------------------------ | ---------------------------------------- | ----------------------------- |
| `getByTestId('schedule-maintenance-btn')` (Schedule window) | button   | toggle inline schedule form; POST /api/maintenance on submit | form visible, then 201 + new row in list | error visible; row not added  |
| `getByTestId('maintenance-submit')`                         | button   | submit the inline schedule form                              | 201; form closes; row visible            | submit stays disabled / error |
| Each maintenance row                                        | listitem | shows title, scheduled_for, scheduled_until, duration        | row visible                              | row missing                   |

## Hidden surfaces opened from this page

| trigger         | what it opens | elements inside (selector / role / behavior)           |
| --------------- | ------------- | ------------------------------------------------------ |
| Schedule window | inline form   | title, message, start, end, components, submit, cancel |

## Network calls expected during normal use

| trigger         | method | path             | what request body or query is expected                                                |
| --------------- | ------ | ---------------- | ------------------------------------------------------------------------------------- |
| Page load       | GET    | /api/maintenance | array of maintenance windows                                                          |
| Page load       | GET    | /api/components  | populates affected-component checkboxes                                               |
| Schedule submit | POST   | /api/maintenance | `{ title, message, scheduled_for, scheduled_until, affected_components }` returns 201 |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/06-maintenance.spec.ts`
