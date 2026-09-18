# Page observations: /home

> Captured live via Playwright MCP at `http://localhost:3070/home` after a
> fresh signup (auto-bootstrap creates a default workspace).

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                                            | role    | expected behavior on interaction                                           | success signal                                          | failure signal        |
| --------------------------------------------------------------------- | ------- | -------------------------------------------------------------------------- | ------------------------------------------------------- | --------------------- |
| Sidebar `getByRole('link', { name: 'Verso' })`                        | link    | navigate to `/home`                                                        | URL is `/home`                                          | URL unchanged         |
| Sidebar `getByRole('link', { name: 'Home' })`                         | link    | active route, navigate to `/home`                                          | URL is `/home`, active style                            | URL unchanged         |
| Sidebar `getByRole('link', { name: 'Notes' })`                        | link    | navigate to `/notes`                                                       | URL is `/notes`                                         | URL unchanged         |
| Sidebar `getByRole('link', { name: 'Search' })`                       | link    | navigate to `/search`                                                      | URL is `/search`                                        | URL unchanged         |
| Sidebar `getByRole('link', { name: 'Graph' })`                        | link    | navigate to `/graph`                                                       | URL is `/graph`                                         | URL unchanged         |
| Sidebar `getByRole('link', { name: 'Tags' })`                         | link    | navigate to `/tags`                                                        | URL is `/tags`                                          | URL unchanged         |
| Sidebar `getByRole('link', { name: 'Settings' })`                     | link    | navigate to `/settings`                                                    | URL is `/settings`                                      | URL unchanged         |
| `getByRole('button', { name: /open user menu/i })`                    | button  | open the user-menu popover                                                 | popover appears with profile/sign-out items             | nothing happens       |
| Hero `getByRole('link', { name: /search/i })` (top-right)             | link    | navigate to `/search`                                                      | URL is `/search`                                        | URL unchanged         |
| Hero `getByRole('button', { name: /new note/i })`                     | button  | POST `/api/pages` for the default workspace, then navigate to `/notes/:id` | URL becomes `/notes/<uuid>`, editor renders title input | error or no nav       |
| Stats card "Notes"                                                    | generic | display total page count for the workspace                                 | numeric matches `GET /api/pages` length                 | shows hardcoded value |
| Stats card "Pinned"                                                   | generic | display pinned count                                                       | numeric matches pages with `is_favorited=true`          | hardcoded             |
| Stats card "Updated today"                                            | generic | display today's updated-pages count                                        | matches GET filter `?updated=today`                     | hardcoded             |
| Stats card "Notebook"                                                 | generic | display workspace count                                                    | matches `GET /api/workspaces` length                    | hardcoded             |
| `getByRole('link', { name: /view all notes/i })`                      | link    | navigate to `/notes`                                                       | URL is `/notes`                                         | URL unchanged         |
| Empty state `getByRole('button', { name: /start your first note/i })` | button  | POST `/api/pages`, navigate to `/notes/:id`                                | URL becomes `/notes/<uuid>`                             | nothing happens       |

## Hidden surfaces opened from this page

| trigger                 | what it opens | elements inside (selector / role / behavior) |
| ----------------------- | ------------- | -------------------------------------------- |
| `Open user menu` button | popover       | sign out button, settings link, profile link |

## Network calls expected during normal use

| trigger            | method | path                        | what request body or query is expected                            |
| ------------------ | ------ | --------------------------- | ----------------------------------------------------------------- |
| initial load       | GET    | `/api/profile/me`           | returns user; populates greeting + Verso prefs                    |
| initial load       | GET    | `/api/workspaces`           | returns at least the auto-created default                         |
| initial load       | GET    | `/api/pages?workspace_id=…` | returns list of pages (empty for new user)                        |
| New note button    | POST   | `/api/pages`                | `{ workspace_id, title?: 'Untitled' }`, returns 201 with new page |
| Empty-state button | POST   | `/api/pages`                | same as above                                                     |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/home.spec.ts`
