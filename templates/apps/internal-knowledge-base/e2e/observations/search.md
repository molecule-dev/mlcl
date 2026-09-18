# Page observations: /search (SearchResults)

Observed via Playwright MCP at `/search` and `/search?q=…` while
authenticated as a fresh signup. Server-side substring search hits
GET /api/articles?q= scoped to the authenticated user's readable spaces.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                                                   | role      | expected behavior on interaction                                                                                 | success signal                                               | failure signal                               |
| ---------------------------------------------------------------------------- | --------- | ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ | -------------------------------------------- |
| `page.locator('input[autofocus]')` (search input)                            | searchbox | Typing updates the controlled query state; pressing Enter submits the form, which writes ?q= via setSearchParams | URL becomes `/search?q=<value>`                              | URL stays at /search                         |
| `page.locator('form')` (search form)                                         | form      | Submit handler calls preventDefault() and pushes ?q= via setSearchParams                                         | URL updates to include the new q value                       | navigation triggers full reload or stays put |
| Filter buttons: "All spaces / Engineering / People Ops / Product / Security" | button    | Click sets the local filter state and narrows the rendered hit list to space names matching the filter slug      | active button has primary background; rendered count updates | nothing changes on click                     |
| Empty/idle text "Type a query and press Enter to search."                    | text      | Shown when no q= is in the URL                                                                                   | text is visible on first load                                | shown after a successful query               |
| Empty-results text "Nothing matched. Try fewer words…"                       | text      | Shown after a query when the server returns 0 articles                                                           | visible after typing a no-match query                        | shows "0 results" header but no body         |
| Result rows (CairnArticleRow)                                                | link      | One row per matching article; each row links to /article/:id                                                     | rows render with title, excerpt, space name, status pill     | results blank or stale                       |

## Hidden surfaces opened from this page

(none — search has inline filters only; no menus / modals)

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |

## Network calls expected during normal use

| trigger                      | method | path                    | what request body or query is expected                                                                               |
| ---------------------------- | ------ | ----------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Submit query / open with ?q= | GET    | /api/articles?q=<query> | 200 + array of articles whose title or body_md substring-matches; only includes articles in spaces the user can read |
| Page load (with q)           | GET    | /api/spaces             | 200 + array, used to map space_id → space_name for hit rows                                                          |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/search.spec.ts`
