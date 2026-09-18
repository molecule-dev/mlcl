# Page observations: /calendar (Calendar)

> Filled by AI agent driving the live mental-health-journal smoke-app via
> `scripts/observe-page.mjs --auth` (Playwright).

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                                            | role                          | expected behavior on interaction                            | success signal                         | failure signal |
| --------------------------------------------------------------------- | ----------------------------- | ----------------------------------------------------------- | -------------------------------------- | -------------- |
| `getByRole('heading', { level: 1, name: /^Calendar$/ })`              | heading                       | renders page title                                          | visible                                | not rendered   |
| `getByRole('button', { name: /previous month/i })`                    | button                        | scrolls back one month, refetches calendar                  | month label changes                    | unchanged      |
| `getByRole('button', { name: /next month/i })`                        | button                        | scrolls forward one month, refetches calendar               | month label changes                    | unchanged      |
| `getByText(/Tracked 0 of 31 days                                      | Tracked \\d+ of \\d+ days/i)` | text                                                        | shows tracked-day count for fresh user | visible        | demo data showing |
| `getByRole('button', { name: /Day 1 — /i })`                          | button                        | calendar cell; disabled if no entry, navigates if has entry | aria-label includes date               | not rendered   |
| `getByRole('heading', { level: 3, name: /This month at a glance/i })` | heading                       | renders monthly mood distribution panel                     | visible                                | not rendered   |

## Hidden surfaces opened from this page

| trigger         | what it opens | elements inside (selector / role / behavior) |
| --------------- | ------------- | -------------------------------------------- |
| (none observed) | —             | —                                            |

## Network calls expected during normal use

| trigger            | method | path                               | what request body or query is expected |
| ------------------ | ------ | ---------------------------------- | -------------------------------------- |
| Page load          | GET    | /api/journal/calendar/:year/:month | (no body)                              |
| Click "Next month" | GET    | /api/journal/calendar/:year/:month | (no body)                              |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/calendar.spec.ts`
