# Page observations: /analytics (Analytics dashboard)

> Filled by AI agent driving the running app via Playwright MCP at
> http://localhost:3060/analytics. Auth-required (AuthGuard) — sign up first.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                                     | role      | expected behavior on interaction                             | success signal               | failure signal   |
| -------------------------------------------------------------- | --------- | ------------------------------------------------------------ | ---------------------------- | ---------------- |
| `[data-mol-id="analytics-kpis"]`                               | section   | wraps four KPI cards                                         | container visible after load | not found        |
| `[data-mol-id="kpi-total-views"]`                              | KpiCard   | shows totalViews from /api/analytics/summary                 | numeric value rendered       | placeholder dash |
| `[data-mol-id="kpi-published-posts"]`                          | KpiCard   | shows publishedPosts count                                   | numeric value rendered       | not found        |
| `[data-mol-id="kpi-total-claps"]`                              | KpiCard   | shows totalClaps count                                       | numeric value rendered       | not found        |
| `[data-mol-id="kpi-total-comments"]`                           | KpiCard   | shows totalComments count                                    | numeric value rendered       | not found        |
| `getByRole('heading', { name: /Views Over Time/i })` (chart)   | section   | renders ViewsOverTimeChart with /api/analytics/views?days=14 | svg/canvas chart drawn       | empty area       |
| `getByRole('heading', { name: /Top Posts/i })` (table)         | section   | TopPostsTable lists topPosts from summary                    | rows rendered or empty-state | error            |
| `getByRole('heading', { name: /Traffic Sources/i })` (sidebar) | section   | TrafficSourcesSidebar visible                                | section visible              | not found        |
| `[data-mol-id="analytics-loading"]` (loading state)            | paragraph | renders during fetch, disappears on resolve                  | absent after networkidle     | persists         |

## Hidden surfaces opened from this page

| trigger         | what it opens | elements inside |
| --------------- | ------------- | --------------- |
| (none directly) | —             | —               |

## Network calls expected during normal use

| trigger   | method | path                         | what request body or query is expected                                             |
| --------- | ------ | ---------------------------- | ---------------------------------------------------------------------------------- |
| page load | GET    | /api/analytics/summary       | no body, returns {totalViews, publishedPosts, totalClaps, totalComments, topPosts} |
| page load | GET    | /api/analytics/views?days=14 | no body, returns {points:[{date,views}], totalViews}                               |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented
- [x] Every link href is documented
- [x] Every dynamic state (loading/empty/error/populated) is observed
- [x] All elements above have a corresponding test in `e2e/analytics.spec.ts`
