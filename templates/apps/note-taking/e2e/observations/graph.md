# Page observations: /graph

> Captured live via Playwright MCP at `http://localhost:3070/graph`.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                                          | role    | expected behavior on interaction                        | success signal             | failure signal          |
| ------------------------------------------------------------------- | ------- | ------------------------------------------------------- | -------------------------- | ----------------------- |
| Sidebar `getByRole('link', { name: 'Verso' })`                      | link    | navigate to `/home`                                     | URL is `/home`             | URL unchanged           |
| Sidebar nav links (Home / Notes / Search / Graph / Tags / Settings) | link    | navigate to the named route                             | URL becomes that path      | URL unchanged           |
| `getByRole('button', { name: /open user menu/i })`                  | button  | open user-menu popover                                  | popover appears            | nothing happens         |
| Page label "Graph" + heading "Knowledge graph"                      | heading | always renders top of page                              | visible                    | missing                 |
| Notes-count summary text ("N notes in this workspace")              | text    | reflects `GET /api/pages?workspace_id=…` length         | numeric matches API count  | shows hardcoded number  |
| Empty-graph card "Backlink graph coming soon"                       | text    | displayed while no `[[wiki]]` links exist between pages | visible for fresh accounts | shown after links exist |
| `getByRole('link', { name: /browse notes/i })`                      | link    | navigate to `/notes`                                    | URL is `/notes`            | URL unchanged           |

## Hidden surfaces opened from this page

| trigger          | what it opens | elements inside (selector / role / behavior) |
| ---------------- | ------------- | -------------------------------------------- |
| `Open user menu` | popover       | shared sidebar user popover                  |

## Network calls expected during normal use

| trigger      | method | path                        | what request body or query is expected         |
| ------------ | ------ | --------------------------- | ---------------------------------------------- |
| initial load | GET    | `/api/workspaces`           | returns user's workspaces                      |
| initial load | GET    | `/api/pages?workspace_id=…` | returns pages array; count drives summary text |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/graph.spec.ts`
