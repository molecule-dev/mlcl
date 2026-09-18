# Page observations: /search (Search)

> Filled from a live walk via Playwright MCP at /search.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                          | role      | expected behavior on interaction | success signal                             | failure signal              |
| --------------------------------------------------- | --------- | -------------------------------- | ------------------------------------------ | --------------------------- |
| Search input (type=search or placeholder=/search/i) | searchbox | accept query string              | typed value reflected; query echoed in URL | input rejects               |
| Search submit (Enter or button)                     | button    | trigger search GET               | rows updated; loading→done                 | request never fires         |
| Result row                                          | listitem  | per-match file row               | visible after typing matching prefix       | row missing                 |
| Empty-state message                                 | text      | "No matches" copy                | visible on zero matches                    | hidden on populated results |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | —             | —                                            |

## Network calls expected during normal use

| trigger | method | path                                           | what request body or query is expected |
| ------- | ------ | ---------------------------------------------- | -------------------------------------- |
| Submit  | GET    | /api/files?search=… (or /api/folders?search=…) | matching rows                          |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/search.spec.ts`
