# Page observations: /search

> Observed via Playwright at http://localhost:3080/search — full-text
> search page rendered by `pages/Search.tsx`. Real /api/search backend.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                      | role        | expected behavior on interaction                      | success signal                           | failure signal            |
| ----------------------------------------------- | ----------- | ----------------------------------------------------- | ---------------------------------------- | ------------------------- |
| `getByRole('heading', { name: /search/i })`     | heading     | renders the page title                                | visible                                  | missing                   |
| Search input `input[type=text]` (line 106)      | textbox     | accepts a query, fires GET /api/search?q={q} on input | results appear or empty state            | no fetch fired            |
| `getByRole('button', { name: /cancel            | clear/i })` | button                                                | clears the query, returns to empty state | input emptied, no results | input still filled |
| Submit button (search icon)                     | button      | submits the query                                     | results render                           | no-op                     |
| Result list `getByRole('link')` for each result | link        | each links to /stories/:id                            | URL becomes /stories/:id                 | broken                    |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside |
| ------- | ------------- | --------------- |
| (none)  | —             | —               |

## Network calls expected during normal use

| trigger    | method | path                  | what request body or query is expected |
| ---------- | ------ | --------------------- | -------------------------------------- |
| Type query | GET    | /api/search?q=climate | matching stories[]                     |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented
- [x] Every link href is documented
- [x] Every dynamic state (loading/empty/error/populated) is observed
- [x] All elements above have a corresponding test in `e2e/06-search.spec.ts` (real query + clear)
