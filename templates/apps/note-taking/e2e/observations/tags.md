# Page observations: /tags

> Captured live via Playwright MCP at `http://localhost:3070/tags` after a
> fresh signup. Tags are derived from `#hashtag` matches in page titles
> (no separate tags table).

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                                          | role    | expected behavior on interaction                             | success signal                      | failure signal                |
| ------------------------------------------------------------------- | ------- | ------------------------------------------------------------ | ----------------------------------- | ----------------------------- |
| Sidebar `getByRole('link', { name: 'Verso' })`                      | link    | navigate to `/home`                                          | URL is `/home`                      | URL unchanged                 |
| Sidebar nav links (Home / Notes / Search / Graph / Tags / Settings) | link    | navigate to the named route                                  | URL becomes that path               | URL unchanged                 |
| `getByRole('button', { name: /open user menu/i })`                  | button  | open user-menu popover                                       | popover appears                     | nothing happens               |
| Page heading "Tags"                                                 | heading | always present                                               | visible                             | missing                       |
| `[data-testid="tags-summary"]` text                                 | text    | shows derived tag count + notes count                        | reflects `useWorkspacePages` length | hardcoded                     |
| `[data-testid="tags-empty"]` block                                  | region  | shown when no `#hashtag` exists in any title                 | visible for fresh accounts          | hidden when no hashtags exist |
| `getByRole('link', { name: /go to notes/i })` (empty state)         | link    | navigate to `/notes`                                         | URL is `/notes`                     | URL unchanged                 |
| `[data-testid="tags-table"]`                                        | region  | rendered after at least one page title contains a `#hashtag` | shows aggregated tag rows           | hidden when tags exist        |

## Hidden surfaces opened from this page

| trigger          | what it opens | elements inside (selector / role / behavior) |
| ---------------- | ------------- | -------------------------------------------- |
| `Open user menu` | popover       | shared sidebar user popover                  |

## Network calls expected during normal use

| trigger      | method | path                        | what request body or query is expected                         |
| ------------ | ------ | --------------------------- | -------------------------------------------------------------- |
| initial load | GET    | `/api/workspaces`           | returns user's workspaces                                      |
| initial load | GET    | `/api/pages?workspace_id=…` | array of pages; titles are scanned client-side for `#hashtags` |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/tags.spec.ts`
