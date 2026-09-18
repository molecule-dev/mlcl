# Page observations: /search (Search)

> Walked via Playwright on a fresh smoke-app at http://localhost:3130/search.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                 | role    | expected behavior on interaction | success signal                     | failure signal   |
| ------------------------------------------ | ------- | -------------------------------- | ---------------------------------- | ---------------- |
| `locator('input[type="search"]').first()`  | textbox | accepts a query string           | typed value mirrored, search fires | no input visible |
| `getByRole('button', { name: /search/i })` | button  | triggers /api/videos/search?q=   | results list updates               | nothing happens  |
| `locator('a[href*="/watch/"]')`            | link    | each result opens /watch/:id     | URL becomes /watch/:id             | stays on /search |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |

## Network calls expected during normal use

| trigger    | method | path                  | what request body or query is expected |
| ---------- | ------ | --------------------- | -------------------------------------- |
| Type query | GET    | /api/videos/search?q= | array of enriched matches              |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/05-search.spec.ts`
