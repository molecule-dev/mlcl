# Page observations: /search (Search)

Universal search across sessions and courses. Asserts debounced query → backend.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                   | role      | expected behavior on interaction                                          | success signal                              | failure signal                    |
| -------------------------------------------- | --------- | ------------------------------------------------------------------------- | ------------------------------------------- | --------------------------------- |
| search input box                             | searchbox | typing debounces and fires /api/sessions?q=… plus /api/courses fetch      | matching session cards appear within 1.5s   | results never update              |
| session result links `a[href^="/sessions/"]` | list      | renders matching sessions returned by the API                             | at least one match for a known seeded title | no matches for known seeded title |
| category suggestion chips                    | button    | clicking a chip pre-fills the query and fetches results for that category | input value + URL update                    | no change                         |

## Hidden surfaces opened from this page

| trigger            | what it opens | elements inside (selector / role / behavior) |
| ------------------ | ------------- | -------------------------------------------- |
| (none — flat page) | —             | —                                            |

## Network calls expected during normal use

| trigger                | method | path                   | what request body or query is expected |
| ---------------------- | ------ | ---------------------- | -------------------------------------- |
| initial load           | GET    | /api/categories        | 200 with categories                    |
| type query (debounced) | GET    | /api/sessions?q=<term> | 200 with matching sessions             |
| type query (debounced) | GET    | /api/courses           | 200 with courses                       |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in the matching spec file
