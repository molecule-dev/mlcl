# Page observations: /reports/:id (ReportDetail)

> Authenticated. Full report detail with hero series, KPIs, sub-charts,
> AI summary, and data table from /api/saved_reports/:id.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name           | role     | expected behavior on interaction     | success signal             | failure signal |
| ------------------------------------ | -------- | ------------------------------------ | -------------------------- | -------------- |
| `page.locator('main ul li').first()` | listitem | renders the hero series row          | visible                    | missing        |
| `page.locator('aside')`              | aside    | renders the AI summary aside         | text contains "AI summary" | missing        |
| `page.locator('table').last()`       | table    | renders the data table at the bottom | visible                    | missing        |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside |
| ------- | ------------- | --------------- |
| (none)  | —             | —               |

## Network calls expected during normal use

| trigger   | method | path                   | expected body                                                       |
| --------- | ------ | ---------------------- | ------------------------------------------------------------------- |
| Page load | GET    | /api/saved_reports/:id | full report detail (hero, kpis, sub-charts, ai_summary, data_table) |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/15-reports__id.spec.ts`
