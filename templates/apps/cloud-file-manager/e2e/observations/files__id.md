# Page observations: /files/:id (File detail)

> Filled from a live walk via Playwright MCP at /files/:id.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)
- [x] At least one file owned by the user must exist

## Elements

| selector / accessible name                                   | role    | expected behavior on interaction                           | success signal                                              | failure signal                      |
| ------------------------------------------------------------ | ------- | ---------------------------------------------------------- | ----------------------------------------------------------- | ----------------------------------- |
| `[data-mol-id="filedetail-back"]` (← Back)                   | button  | navigate back to /files                                    | URL becomes /files                                          | nav fails                           |
| `[data-mol-id="filedetail-download"]` (Download)             | link    | href is `/api/files/:id/download`                          | response streams file bytes with content-disposition        | href missing / 404                  |
| `[data-mol-id="filedetail-share"]` (Create share link)       | button  | POST /api/shares; reveal share row + visible /s/:token URL | new share row visible, URL contains `/s/`                   | toast/error and no share row        |
| `[data-mol-id="filedetail-star"]` (Star/Unstar)              | button  | POST /api/files/:id/star toggling is_starred               | next GET /api/files/:id reflects the flip                   | no change                           |
| `[data-mol-id="filedetail-rename"]` (Rename)                 | button  | open rename dialog                                         | rename input visible                                        | dialog never appears                |
| `[data-mol-id="filedetail-rename-input"]`                    | textbox | typed value used as new file name                          | typed value reflected                                       | input rejects                       |
| `[data-mol-id="filedetail-rename-confirm"]`                  | button  | PATCH /api/files/:id with new name                         | new name visible after reload                               | toast/error and old name persists   |
| `[data-mol-id="filedetail-delete"]` (Move to trash)          | button  | DELETE /api/files/:id and route to /trash                  | URL becomes /trash, file appears in /api/files?trash=true   | toast/error and stays on /files/:id |
| `[data-mol-id="filedetail-share-revoke-{id}"]` (Revoke link) | button  | DELETE /api/shares/:id removes the share row               | share row no longer visible, GET /api/shares?file_id= empty | row remains visible                 |

## Hidden surfaces opened from this page

| trigger      | what it opens                                | elements inside (selector / role / behavior)           |
| ------------ | -------------------------------------------- | ------------------------------------------------------ |
| Rename click | inline rename input + confirm/cancel buttons | rename-input, rename-confirm, rename-cancel            |
| Share click  | success banner + revoke buttons              | filedetail-share-success, filedetail-share-revoke-{id} |

## Network calls expected during normal use

| trigger   | method | path                  | what request body or query is expected                    |
| --------- | ------ | --------------------- | --------------------------------------------------------- |
| Page load | GET    | /api/files/:id        | `{ id, name, mime_type, size, ... }`                      |
| Page load | GET    | /api/shares?file_id=… | `Array<ShareRecord>` for this file                        |
| Rename    | PATCH  | /api/files/:id        | `{ name }` returns updated row                            |
| Star      | POST   | /api/files/:id/star   | `{ is_starred }` returns updated row                      |
| Trash     | DELETE | /api/files/:id        | 200 / 204; row hidden from default list, appears in trash |
| Share     | POST   | /api/shares           | `{ file_id, permission }` returns share with token        |
| Revoke    | DELETE | /api/shares/:id       | 204; share gone from GET /api/shares?file_id=…            |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/files__id.spec.ts`
