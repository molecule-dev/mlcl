# Page observations: /library (Library)

> Walked via Playwright on a fresh smoke-app at http://localhost:3130/library.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                   | role                 | expected behavior on interaction                            | success signal                  | failure signal                                   |
| -------------------------------------------- | -------------------- | ----------------------------------------------------------- | ------------------------------- | ------------------------------------------------ |
| `getByRole('heading', { name: /watch history | recent/i }).first()` | heading                                                     | shows the watch-history section | section visible with most-recently watched first | section missing |
| `locator('a[href*="/watch/"]')`              | link                 | clicking a history row reopens the corresponding /watch/:id | URL becomes /watch/:id          | nothing happens                                  |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |

## Network calls expected during normal use

| trigger | method | path                 | what request body or query is expected |
| ------- | ------ | -------------------- | -------------------------------------- |
| Mount   | GET    | /api/library/history | array of recently watched videos       |
| Mount   | GET    | /api/library/later   | array of saved-for-later videos        |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/07-library.spec.ts`
