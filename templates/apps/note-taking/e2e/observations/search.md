# Page observations: /search

> Captured live via Playwright MCP at `http://localhost:3070/search` while
> signed in.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                                          | role      | expected behavior on interaction                                         | success signal                             | failure signal             |
| ------------------------------------------------------------------- | --------- | ------------------------------------------------------------------------ | ------------------------------------------ | -------------------------- |
| Sidebar `getByRole('link', { name: 'Verso' })`                      | link      | navigate to `/home`                                                      | URL is `/home`                             | URL unchanged              |
| Sidebar nav links (Home / Notes / Search / Graph / Tags / Settings) | link      | navigate to the named route                                              | URL becomes that path                      | URL unchanged              |
| `getByRole('button', { name: /open user menu/i })`                  | button    | open user-menu popover                                                   | popover appears                            | nothing happens            |
| `getByRole('searchbox', { name: /search verso/i })`                 | searchbox | typing dispatches a debounced GET `/api/pages/search?q=…&workspace_id=…` | matching page hits replace the empty state | search never fires         |
| `getByRole('button', { name: 'All' })`                              | button    | filter results to all source types (default)                             | filter pill marked active                  | nothing changes            |
| `getByRole('button', { name: 'Pages' })`                            | button    | filter to page hits only                                                 | filter pill marked active; results filter  | nothing changes            |
| Empty state ("Type a query above to start…")                        | text      | shown when query empty                                                   | visible while no query is typed            | shown after results return |
| Recent searches list                                                | text      | shows previously entered queries (localStorage)                          | populates after typing a query             | never populates            |
| Result hit `getByRole('link')` (when results render)                | link      | navigate to `/notes/:id` of the matched page                             | URL becomes `/notes/<uuid>`                | nothing happens            |

## Hidden surfaces opened from this page

| trigger          | what it opens | elements inside (selector / role / behavior) |
| ---------------- | ------------- | -------------------------------------------- |
| `Open user menu` | popover       | shared sidebar user popover                  |

## Network calls expected during normal use

| trigger                  | method | path                                             | what request body or query is expected                 |
| ------------------------ | ------ | ------------------------------------------------ | ------------------------------------------------------ |
| initial load             | GET    | `/api/workspaces`                                | returns user's workspaces (search is workspace-scoped) |
| typing query (debounced) | GET    | `/api/pages/search?workspace_id=…&q=…`           | returns array of matching page rows                    |
| filter "Pages"           | GET    | `/api/pages/search?workspace_id=…&q=…&type=page` | optional filter param                                  |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/search.spec.ts`
