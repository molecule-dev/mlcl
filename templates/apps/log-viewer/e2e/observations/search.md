# Page observations: /search (Search)

> Authenticated. Live tail with severity filters and click-to-inspect.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                                  | role    | expected behavior on interaction   | success signal             | failure signal |
| ----------------------------------------------------------- | ------- | ---------------------------------- | -------------------------- | -------------- |
| `page.locator('[data-mol-id="search-query"]')`              | textbox | filters log lines on input         | value matches typed text   | unchanged      |
| `page.locator('[data-mol-id="search-filter-error"]')`       | button  | filter to severity=error           | active state on pill       | unchanged      |
| `page.locator('main button, main [role="button"]').first()` | button  | click row to populate detail panel | aside renders selected log | empty          |
| `page.locator('[data-mol-id="search-status-bar"]')`         | status  | shows matched/scanned counts       | text visible               | empty          |
| `page.locator('svg').first()`                               | image   | renders timeline volume sparkline  | svg present                | absent         |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside |
| ------- | ------------- | --------------- |

## Network calls expected during normal use

| trigger   | method | path      | expected body  |
| --------- | ------ | --------- | -------------- |
| Page load | GET    | /api/logs | log lines list |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/11-search.spec.ts`
