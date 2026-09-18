# Page observations: /insights (Insights)

> Filled by AI agent driving the live mental-health-journal smoke-app via
> `scripts/observe-page.mjs --auth` (Playwright).

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                                                  | role    | expected behavior on interaction                  | success signal         | failure signal |
| --------------------------------------------------------------------------- | ------- | ------------------------------------------------- | ---------------------- | -------------- |
| `getByRole('heading', { level: 1, name: /^Insights$/i })`                   | heading | renders page title                                | visible                | not rendered   |
| `getByRole('heading', { level: 3, name: /Mood timeline/i })`                | heading | renders mood-trend section                        | visible                | not rendered   |
| `getByRole('img', { name: /Mood trend chart/i })`                           | img     | renders SVG chart with last-14-days data from API | aria-label set, in DOM | chart missing  |
| `getByText(/AI reflection/i)`                                               | text    | renders AI summary panel                          | visible                | not rendered   |
| `getByRole('heading', { level: 3, name: /Top themes/i })`                   | heading | renders themes section                            | visible                | not rendered   |
| `getByRole('heading', { level: 3, name: /Patterns that move your mood/i })` | heading | renders triggers section                          | visible                | not rendered   |

## Hidden surfaces opened from this page

| trigger         | what it opens | elements inside (selector / role / behavior) |
| --------------- | ------------- | -------------------------------------------- |
| (none observed) | —             | —                                            |

## Network calls expected during normal use

| trigger   | method | path                  | what request body or query is expected |
| --------- | ------ | --------------------- | -------------------------------------- |
| Page load | GET    | /api/journal/insights | (no body)                              |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/insights.spec.ts`
