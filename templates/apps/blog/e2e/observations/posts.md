# Page observations: /posts (Author post list)

> Filled by AI agent driving the running app via Playwright MCP at
> http://localhost:3060/posts. Auth-required.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                                      | role        | expected behavior on interaction                        | success signal                                          | failure signal         |
| --------------------------------------------------------------- | ----------- | ------------------------------------------------------- | ------------------------------------------------------- | ---------------------- |
| Page heading "My posts" / similar (PostListHeader)              | heading     | renders page title                                      | visible                                                 | missing                |
| `getByRole('link', { name: /new post/i })` (PostListHeader CTA) | link        | navigates to /posts/new                                 | URL becomes /posts/new                                  | unchanged              |
| Filter chip "All" (PostListFilterBar)                           | button      | sets activeFilter='all' & refetches                     | GET /api/posts/mine/all (no status param or status=all) | network not refired    |
| Filter chip "Published"                                         | button      | sets activeFilter='published' & refetches               | GET /api/posts/mine/all?status=published                | not refired            |
| Filter chip "Draft"                                             | button      | sets activeFilter='draft' & refetches                   | GET /api/posts/mine/all?status=draft                    | not refired            |
| Filter chip "Scheduled"                                         | button      | sets activeFilter='scheduled' & refetches               | GET /api/posts/mine/all?status=scheduled                | not refired            |
| Search input (PostListFilterBar)                                | textbox     | filters list by typed query                             | input accepted, list filters                            | not editable           |
| List items (PostListItem)                                       | listitem(s) | each row shows title/status/excerpt/views/comments/date | rows render after fetch                                 | empty when posts exist |
| Per-row Edit link                                               | link        | navigates to /posts/:id/edit                            | URL contains /posts/<id>/edit                           | unchanged              |
| Per-row Delete button                                           | button      | DELETE /api/posts/:id                                   | row disappears                                          | row remains            |
| PostListPagination Next/Prev                                    | button      | changes page → triggers refetch                         | URL/state updates, GET fired                            | unchanged              |
| Empty-state copy "No posts found."                              | text        | shown when posts.length===0                             | visible                                                 | hidden when populated  |

## Hidden surfaces opened from this page

| trigger                 | what it opens | elements inside |
| ----------------------- | ------------- | --------------- |
| (none — top-level list) | —             | —               |

## Network calls expected during normal use

| trigger       | method | path                                         | what request body or query is expected |
| ------------- | ------ | -------------------------------------------- | -------------------------------------- |
| page load     | GET    | /api/posts/mine/all?page=1&limit=20          | author's posts, all statuses           |
| filter change | GET    | /api/posts/mine/all?status=…&page=1&limit=20 | refetch on chip click                  |
| delete row    | DELETE | /api/posts/:id                               | drops the row                          |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented
- [x] Every link href is documented
- [x] Every dynamic state (loading/empty/error/populated) is observed
- [x] All elements above have a corresponding test in `e2e/posts.spec.ts`
