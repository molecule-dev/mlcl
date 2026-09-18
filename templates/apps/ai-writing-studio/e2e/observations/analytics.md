# Page observations: /analytics (Analytics)

> Filled by AI agent driving the running app via Playwright.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                                            | role    | expected behavior on interaction                            | success signal       | failure signal  |
| --------------------------------------------------------------------- | ------- | ----------------------------------------------------------- | -------------------- | --------------- |
| `getByRole('heading', { name: /^Analytics$/i, level: 1 })`            | heading | page title renders                                          | h1 visible           | h1 missing      |
| `getByText(/Total words/i)`                                           | text    | total-words KPI tile renders                                | tile + value visible | tile missing    |
| `getByText(/^Published$/i).first()`                                   | text    | published-count KPI renders                                 | tile visible         | tile missing    |
| `getByText(/^Drafts$/i)`                                              | text    | drafts-count KPI renders                                    | tile visible         | tile missing    |
| `getByText(/Avg read time/i)`                                         | text    | avg read-time KPI renders                                   | tile visible         | tile missing    |
| `getByRole('heading', { name: /Writing activity/i, level: 2 })`       | heading | activity section renders with empty-state copy or sparkline | h2 visible           | section missing |
| `getByRole('heading', { name: /Top articles by length/i, level: 2 })` | heading | top-articles section renders                                | h2 visible           | section missing |
| `getByRole('heading', { name: /Traffic sources/i, level: 2 })`        | heading | traffic-sources section renders                             | h2 visible           | section missing |
| `getByRole('heading', { name: /Reader geography/i, level: 2 })`       | heading | geography section renders                                   | h2 visible           | section missing |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | —             | —                                            |

## Network calls expected during normal use

| trigger        | method | path           | what request body or query is expected                               |
| -------------- | ------ | -------------- | -------------------------------------------------------------------- |
| initial render | GET    | /api/analytics | returns `{ totals, series, topArticles, trafficSources, geography }` |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/analytics.spec.ts`
