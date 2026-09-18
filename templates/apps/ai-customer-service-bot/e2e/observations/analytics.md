# Page observations: /analytics (Analytics)

Captured from `browser_snapshot` on `http://localhost:3100/analytics`
after `signup(page)`. Single-column page: title, four KPI cards
(Avg CSAT, Resolution rate, Helpful feedback, Escalations), the
"Conversations per day" trend chart, the "By channel" panel and
the "Quality signals" panel.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                  | role      | expected behavior on interaction                                   | success signal                                                              | failure signal         |
| ------------------------------------------- | --------- | ------------------------------------------------------------------ | --------------------------------------------------------------------------- | ---------------------- |
| `[data-mol-id="page-analytics"]`            | container | renders after auth                                                 | element visible after navigate                                              | element never appears  |
| `[data-mol-id="analytics-kpi-csat"]`        | text      | shows the average CSAT score from /api/analytics summary           | numeric "X.XX" + "/ 5" rendered                                             | shows "—" indefinitely |
| `[data-mol-id="analytics-kpi-resolution"]`  | text      | shows resolution rate as a percentage                              | number + "%" rendered                                                       | empty / NaN            |
| `[data-mol-id="analytics-kpi-helpful"]`     | text      | shows helpful feedback rate                                        | number + "%" rendered                                                       | empty / NaN            |
| `[data-mol-id="analytics-kpi-escalations"]` | text      | shows total escalated conversations                                | numeric value rendered                                                      | shows "—" indefinitely |
| `[data-mol-id="analytics-trend-chart"]`     | svg       | renders area chart over the last 14 days from `summary.timeseries` | svg path rendered                                                           | svg missing            |
| `[data-mol-id="analytics-channels"]`        | container | renders per-channel breakdown OR "No channel data yet."            | one of the two states present                                               | neither present        |
| `[data-mol-id="analytics-quality"]`         | container | renders helpful + resolution meters                                | both `analytics-quality-helpful` and `analytics-quality-resolution` visible | missing                |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | —             | —                                            |

## Network calls expected during normal use

| trigger   | method | path           | what request body or query is expected        |
| --------- | ------ | -------------- | --------------------------------------------- |
| Page load | GET    | /api/analytics | `{ summary, channels, timeseries }` aggregate |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/analytics.spec.ts`
