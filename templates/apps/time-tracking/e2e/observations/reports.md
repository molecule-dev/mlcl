# Page observations: /reports (Reports)

> Filled by AI agent driving the running smoke app on 3060/4060 with
> Playwright MCP, then re-validated by the e2e spec set
> (see e2e/reports.spec.ts).

> auth-protected analytics view: KPI strip, hours-per-day chart, billable
> mix donut, by-project breakdown table with CSV export. Range buttons
> (this-week / this-month / last-month / this-year) drive the dataset.

## Procedure

1. Sign up first via `signup(page)`; seed at least one billable entry.
2. `mcp__playwright__browser_navigate` → `/reports`.
3. `mcp__playwright__browser_snapshot` → walk every interactive node.
4. Click each range button.
5. Click Export CSV.
6. Re-pass: navigate again, confirm no new elements appear.
7. Author `e2e/reports.spec.ts`.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`).

## Elements

| selector / accessible name                                                                    | role        | expected behavior on interaction                                          | success signal                           | failure signal |
| --------------------------------------------------------------------------------------------- | ----------- | ------------------------------------------------------------------------- | ---------------------------------------- | -------------- |
| `[data-test="reports-page"]`                                                                  | container   | renders the page root                                                     | element visible                          | missing        |
| `heading "Reports"` (h1)                                                                      | heading     | page title                                                                | h1 visible                               | missing        |
| `[data-test="range-this-week"]` / `range-this-month` / `range-last-month` / `range-this-year` | button      | selects the active range; KPIs and table refresh                          | active style flips, network call refires | no refresh     |
| KPI cell "Total hours"                                                                        | text        | period total tracked hours                                                | text visible                             | missing        |
| KPI cell "Billable hours"                                                                     | text        | period billable hours                                                     | text visible                             | missing        |
| KPI cell "Estimated revenue"                                                                  | text        | period billable revenue                                                   | dollar text visible                      | missing        |
| KPI cell "Billable %"                                                                         | text        | billable share of total                                                   | percentage visible                       | missing        |
| `heading "Hours per day"` (h2)                                                                | heading     | renders chart card                                                        | h2 visible                               | missing        |
| `[data-test="reports-bar-empty"]`                                                             | empty-state | "No tracked time in this period." for users with zero entries             | element visible                          | missing        |
| `heading "By project"` (h2)                                                                   | heading     | renders the table card                                                    | h2 visible                               | missing        |
| `[data-test="reports-export"]`                                                                | button      | downloads CSV file with header + at least one data row when entries exist | browser download fires; file > 0 bytes   | no download    |
| `[data-test="reports-table-empty"]`                                                           | empty-state | empty copy when no project breakdown                                      | element visible                          | missing        |
| `[data-test="report-row-<projectId>"]`                                                        | row         | per-project row with hours / share / revenue                              | row visible after seeding                | missing        |

## Hidden surfaces opened from this page

(none)

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |

## Network calls expected during normal use

| trigger     | method | path                                | what request body or query is expected |
| ----------- | ------ | ----------------------------------- | -------------------------------------- |
| load        | GET    | /api/reports?range=this-week (etc.) | { aggregates, perProject }             |
| range click | GET    | /api/reports?range=...              | refetch with new range                 |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/reports.spec.ts`
