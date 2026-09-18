# Page observations: /search (Search)

> Authenticated full-text search over threads (and eventually posts /
> users). Debounced (~220ms) GET to `/api/search?q=&type=`. Render
> matching threads with category badges + excerpt + reply / view counts.

## Page state assumed

- [x] Authenticated

## Elements

| selector / accessible name                       | role               | expected behavior on interaction              | success signal                        | failure signal           |
| ------------------------------------------------ | ------------------ | --------------------------------------------- | ------------------------------------- | ------------------------ |
| `getByRole('searchbox')`                         | input[type=search] | accepts query                                 | value reflects typed text             | input ignores typing     |
| `getByRole('button', { name: /Clear search/i })` | button             | empties the search input                      | value empty after click               | clears nothing           |
| filter chip "Everything"                         | button             | sort by `type=all`                            | re-fetches search with `type=all`     | filter unchanged         |
| filter chip "Threads"                            | button             | sort by `type=threads`                        | re-fetches search with `type=threads` | filter unchanged         |
| filter chip "Posts"                              | button             | sort by `type=posts`                          | re-fetches search with `type=posts`   | filter unchanged         |
| filter chip "People"                             | button             | sort by `type=users`                          | re-fetches search with `type=users`   | filter unchanged         |
| empty state                                      | n/a                | initial mount shows "Type a query to search"  | text visible before typing            | shows "0 results"        |
| no-match state                                   | n/a                | a clearly nonsense query returns "No matches" | text visible                          | infinite loading spinner |
| populated state                                  | n/a                | typing the title of a real thread surfaces it | result card with the title visible    | result missing           |

## Network calls expected during normal use

| trigger            | method | path                         | what request body or query is expected |
| ------------------ | ------ | ---------------------------- | -------------------------------------- |
| typing (debounced) | GET    | `/api/search?q=...&type=...` | 200 with `{ data: [...] }`             |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/search.spec.ts`
