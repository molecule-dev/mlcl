# Page observations: /reports (Reports / Analytics)

> Filled by the dispatch-flagship agent driving the running app via Playwright MCP.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`) — `/api/reports/analytics` returns aggregated 30d analytics seeded by `_seed.ts`.

## Elements

| selector / accessible name                               | role            | expected behavior on interaction                                      | success signal            | failure signal                  |
| -------------------------------------------------------- | --------------- | --------------------------------------------------------------------- | ------------------------- | ------------------------------- |
| `getByRole('heading', { name: /^reports$/i, level: 1 })` | heading         | page heading                                                          | heading visible           | shell error                     |
| Subheading text                                          | text            | static "Last 30 days · scheduled reports below"                       | visible                   | absent                          |
| KPI: Miles                                               | text            | `report.miles_30d` formatted with thousands separator                 | numeric ≥ 0               | NaN / "Failed to load reports." |
| KPI: Fuel                                                | text            | `report.fuel_30d_gal` + " gal"                                        | matches `/\\d+ gal/`      | NaN                             |
| KPI: Fuel cost                                           | text            | `$<report.fuel_cost_30d>`                                             | "$N,N"                    | NaN                             |
| KPI: On-time rate                                        | text            | `Math.round(report.on_time_rate * 100)%`, accent-coloured             | "NN%"                     | "NaN%"                          |
| `getByRole('heading', { name: /daily miles/i })`         | heading         | section heading for the bar chart                                     | visible                   | missing                         |
| Daily miles bars                                         | (svg-like divs) | one bar per day in `report.daily_miles[]`, height proportional to max | at least 14 bars rendered | empty chart                     |
| `getByRole('heading', { name: /by vehicle type/i })`     | heading         | section heading for the breakdown table                               | visible                   | missing                         |
| `getByRole('table')`                                     | table           | breakdown by `report.by_vehicle_type[]`                               | rows visible              | empty body                      |
| Table column "MPG" cell                                  | cell            | computed as `miles / fuel_gal` to 1dp                                 | matches `/\\d+\\.\\d/`    | "NaN.NaN"                       |

## Hidden surfaces opened from this page

| trigger                           | what it opens | elements inside (selector / role / behavior) |
| --------------------------------- | ------------- | -------------------------------------------- |
| (none — read-only analytics view) | n/a           | n/a                                          |

## Network calls expected during normal use

| trigger       | method | path                   | what request body or query is expected                                                                                           |
| ------------- | ------ | ---------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Initial mount | GET    | /api/reports/analytics | aggregated stats (miles_30d, fuel_30d_gal, fuel_cost_30d, hours_30d, alerts_30d, on_time_rate, by_vehicle_type[], daily_miles[]) |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/reports.spec.ts`
