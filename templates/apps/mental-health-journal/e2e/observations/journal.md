# Page observations: /journal (Journal)

> Filled by AI agent driving the live mental-health-journal smoke-app via
> `scripts/observe-page.mjs --auth` (Playwright).

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                               | role                        | expected behavior on interaction   | success signal                                                           | failure signal |
| -------------------------------------------------------- | --------------------------- | ---------------------------------- | ------------------------------------------------------------------------ | -------------- |
| `getByRole('heading', { level: 1, name: /^Journal$/i })` | heading                     | renders page title                 | visible                                                                  | not rendered   |
| `getByRole('link', { name: /New entry/i })`              | link                        | navigates to /journal/new          | URL /journal/new                                                         | 4xx/5xx        |
| `getByRole('searchbox')`                                 | searchbox                   | filters list as user types         | matching entries shown                                                   | filter ignored |
| `getByRole('button', { name: /^All$/ })`                 | button                      | shows all entries (default filter) | aria-pressed flips                                                       | filter ignored |
| `getByRole('button', { name: /^Good$/ })`                | button                      | filters by mood: good              | aria-pressed flips, list filters                                         | filter ignored |
| `getByRole('button', { name: /^Radiant$/ })`             | button                      | filters by mood: radiant           | filter applied                                                           | unchanged      |
| `getByText(/No reflections match                         | every one worth keeping/i)` | text                               | empty state when filter has no matches OR header subtitle when populated | visible        | demo data showing |

## Hidden surfaces opened from this page

| trigger         | what it opens | elements inside (selector / role / behavior) |
| --------------- | ------------- | -------------------------------------------- |
| (none observed) | —             | —                                            |

## Network calls expected during normal use

| trigger   | method | path                 | what request body or query is expected |
| --------- | ------ | -------------------- | -------------------------------------- |
| Page load | GET    | /api/journal/entries | (no body)                              |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/journal.spec.ts`
