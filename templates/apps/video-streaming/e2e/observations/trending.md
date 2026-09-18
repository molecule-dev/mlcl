# Page observations: /trending (Trending)

> Walked via Playwright on a fresh smoke-app at http://localhost:3130/trending.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name      | role    | expected behavior on interaction                      | success signal                        | failure signal          |
| ------------------------------- | ------- | ----------------------------------------------------- | ------------------------------------- | ----------------------- |
| `locator('article')`            | article | one card per trending video sorted by view_count desc | first card has the highest view_count | random ordering / empty |
| `locator('a[href*="/watch/"]')` | link    | each card opens /watch/:id                            | URL becomes /watch/:id                | stays on /trending      |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |

## Network calls expected during normal use

| trigger | method | path        | what request body or query is expected                |
| ------- | ------ | ----------- | ----------------------------------------------------- |
| Mount   | GET    | /api/videos | rows ordered by view_count desc (or `?sort=trending`) |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/06-trending.spec.ts`
