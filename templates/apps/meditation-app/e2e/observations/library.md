# Page observations: /library (Library)

Browse all sessions grouped by category. Asserts category tiles and category-filter behaviour.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                | role   | expected behavior on interaction                                            | success signal                                          | failure signal             |
| ----------------------------------------- | ------ | --------------------------------------------------------------------------- | ------------------------------------------------------- | -------------------------- |
| category tiles render with session counts | list   | renders one tile per category from /api/categories with session_count badge | tiles visible, each with a numeric badge                | no tiles or counts missing |
| session cards `a[href^="/sessions/"]`     | list   | renders all sessions returned by /api/sessions                              | at least one session card link visible                  | grid empty                 |
| category filter buttons                   | button | clicking a category tile narrows the session list to that category          | visible session set updates, filter pill becomes active | list unchanged             |

## Hidden surfaces opened from this page

| trigger            | what it opens | elements inside (selector / role / behavior) |
| ------------------ | ------------- | -------------------------------------------- |
| (none — flat page) | —             | —                                            |

## Network calls expected during normal use

| trigger        | method | path                          | what request body or query is expected      |
| -------------- | ------ | ----------------------------- | ------------------------------------------- |
| initial load   | GET    | /api/categories               | 200 with category[] including session_count |
| initial load   | GET    | /api/sessions                 | 200 with seeded sessions                    |
| category click | GET    | /api/sessions?category=<slug> | 200 with filtered sessions                  |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in the matching spec file
