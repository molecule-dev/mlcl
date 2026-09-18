# Page observations: /notes (Notes index)

> Captured live via Playwright MCP at `http://localhost:3070/notes`.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`); auto-bootstrapped default workspace

## Elements

| selector / accessible name                                          | role    | expected behavior on interaction                                          | success signal                                          | failure signal         |
| ------------------------------------------------------------------- | ------- | ------------------------------------------------------------------------- | ------------------------------------------------------- | ---------------------- |
| Sidebar `getByRole('link', { name: 'Verso' })`                      | link    | navigate to `/home`                                                       | URL is `/home`                                          | URL unchanged          |
| Sidebar nav links (Home / Notes / Search / Graph / Tags / Settings) | link    | each navigates to its named route                                         | URL becomes the corresponding path                      | URL unchanged          |
| `getByRole('button', { name: /open user menu/i })`                  | button  | open user-menu popover                                                    | popover with sign-out/profile items                     | nothing happens        |
| `getByRole('heading', { name: 'Notebooks' })`                       | heading | always present                                                            | visible                                                 | missing                |
| `getByRole('button', { name: /new notebook/i })`                    | button  | POST `/api/workspaces` `{ name: 'New notebook' }`, append to sidebar list | new entry appears in list and is selectable             | nothing appears        |
| Notebook list item `getByRole('button', { name: 'My notebook' })`   | button  | select that workspace, refetch its pages                                  | header heading text becomes "My notebook"; list reloads | clicking does nothing  |
| `getByRole('heading', { name: 'My notebook' })`                     | heading | shows the active workspace name                                           | matches sidebar selection                               | mismatch               |
| Notebook count badge                                                | generic | shows page count of active workspace                                      | numeric matches `GET /api/pages?workspace_id=…` length  | hardcoded              |
| `getByRole('button', { name: /All notes/i })`                       | button  | filter list to all (default)                                              | filter active, list shows all pages                     | filter ignored         |
| `getByRole('button', { name: /Pinned/i })`                          | button  | filter list to pinned only                                                | only pages with `is_favorited=true` show                | unfiltered             |
| `getByRole('button', { name: /^new note$/i })`                      | button  | POST `/api/pages` for the active workspace; navigate to `/notes/:id`      | URL becomes `/notes/<uuid>` and editor renders          | error or no nav        |
| Empty-state message "No notes here yet…"                            | text    | shown when workspace has 0 pages                                          | message present                                         | shown when pages exist |

## Hidden surfaces opened from this page

| trigger          | what it opens        | elements inside (selector / role / behavior)       |
| ---------------- | -------------------- | -------------------------------------------------- |
| `Open user menu` | popover              | sign-out, settings link                            |
| `New notebook`   | inline list addition | new workspace becomes selectable button in sidebar |

## Network calls expected during normal use

| trigger                     | method                                                         | path                        | what request body or query is expected                                |
| --------------------------- | -------------------------------------------------------------- | --------------------------- | --------------------------------------------------------------------- |
| initial load                | GET                                                            | `/api/workspaces`           | returns user's workspaces; first is auto-created if list is empty     |
| select notebook / load list | GET                                                            | `/api/pages?workspace_id=…` | array of pages, sorted by updated_at desc                             |
| New notebook click          | POST                                                           | `/api/workspaces`           | `{ name }`, returns created workspace                                 |
| New note click              | POST                                                           | `/api/pages`                | `{ workspace_id, title?: 'Untitled', parent_id?: null }`, returns 201 |
| Pinned filter (re-filter)   | (client-side filter; no extra request unless server-paginated) | —                           | —                                                                     |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/notes.spec.ts`
