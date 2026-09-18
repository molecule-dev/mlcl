# Page observations: /dashboard (Dashboard)

> Authenticated. First call seeds 8 streams, ~30 logs, 5 incidents,
> 4 alerts, 6 saved searches, 4 services, 3 traces.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                       | role              | expected behavior on interaction                       | success signal       | failure signal      |
| ------------------------------------------------ | ----------------- | ------------------------------------------------------ | -------------------- | ------------------- |
| `getByRole('heading', { level: 1 })`             | heading           | renders "Operations overview"                          | text visible         | empty               |
| `page.locator('[data-mol-id="dashboard-hero"]')` | region            | renders 24h volume hero card                           | visible              | hidden              |
| `getByRole('link', { name: /search               | open search/i })` | link                                                   | nav to /search       | URL becomes /search | stays |
| `page.locator('section').nth(1)`                 | region            | renders 4 KPI cards (errors, warnings, incidents, p95) | numeric text visible | empty               |
| `page.locator('aside ul li, aside section')`     | list              | renders saved searches sidebar                         | non-empty            | empty               |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside |
| ------- | ------------- | --------------- |

## Network calls expected during normal use

| trigger   | method | path           | expected body       |
| --------- | ------ | -------------- | ------------------- |
| Page load | GET    | /api/logs      | log lines           |
| Page load | GET    | /api/incidents | incidents list      |
| Page load | GET    | /api/saved     | saved searches list |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/10-dashboard.spec.ts`
