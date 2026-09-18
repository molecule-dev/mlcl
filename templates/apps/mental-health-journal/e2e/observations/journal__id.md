# Page observations: /journal/:id (EntryDetail)

> Filled by AI agent driving the live mental-health-journal smoke-app via
> `scripts/observe-page.mjs --auth --click` chain (Playwright).

## Page state assumed

- [x] Authenticated (sign up + create entry first via API helper)

## Elements

| selector / accessible name                        | role    | expected behavior on interaction | success signal            | failure signal           |
| ------------------------------------------------- | ------- | -------------------------------- | ------------------------- | ------------------------ |
| `getByRole('link', { name: /Back to journal/i })` | link    | navigates back to /journal       | URL /journal              | 4xx/5xx                  |
| `getByRole('heading', { level: 1 })`              | heading | renders entry title from API     | matches created title     | placeholder demo title   |
| `getByText(/End-to-end encrypted/i)`              | text    | encryption badge                 | visible                   | absent                   |
| `getByText(/words$/i)`                            | text    | word count from entry            | visible (e.g. "12 words") | absent                   |
| `getByText(/^#/i).first()`                        | text    | tag chip                         | visible if tags present   | absent if entry had tags |

## Hidden surfaces opened from this page

| trigger         | what it opens | elements inside (selector / role / behavior) |
| --------------- | ------------- | -------------------------------------------- |
| (none observed) | —             | —                                            |

## Network calls expected during normal use

| trigger   | method | path                     | what request body or query is expected |
| --------- | ------ | ------------------------ | -------------------------------------- |
| Page load | GET    | /api/journal/entries/:id | (no body)                              |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/journal__id.spec.ts`
