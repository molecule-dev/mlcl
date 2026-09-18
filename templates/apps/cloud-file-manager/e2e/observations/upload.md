# Page observations: /upload (Upload)

> Filled from a live walk via Playwright MCP at /upload.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name             | role                              | expected behavior on interaction                  | success signal                              | failure signal                            |
| -------------------------------------- | --------------------------------- | ------------------------------------------------- | ------------------------------------------- | ----------------------------------------- |
| `[data-mol-id="upload-dropzone"]`      | region                            | accept dropped files                              | dropped files appear in queue               | drop is silently ignored                  |
| `[data-mol-id="upload-file-input"]`    | textbox (hidden file input)       | proxy for file picker                             | selecting files queues each                 | nothing queued                            |
| `[data-mol-id="upload-folder-input"]`  | textbox (hidden, webkitdirectory) | proxy for folder picker                           | selecting a folder queues every file inside | nothing queued                            |
| `[data-mol-id="upload-choose-files"]`  | button                            | open file picker                                  | OS file picker opens                        | button is unresponsive                    |
| `[data-mol-id="upload-choose-folder"]` | button                            | open folder picker                                | OS folder picker opens                      | button is unresponsive                    |
| `[data-mol-id="upload-back"]`          | button                            | navigate to /files                                | URL becomes /files                          | nav fails                                 |
| `[data-mol-id^="upload-row-"]`         | listitem                          | per-file queue row                                | row mounted with progress + status          | row missing                               |
| `[data-mol-id^="upload-view-"]`        | button                            | after a successful upload, navigate to /files/:id | URL becomes /files/:id                      | button never appears (stuck on uploading) |

## Hidden surfaces opened from this page

| trigger           | what it opens          | elements inside (selector / role / behavior)                |
| ----------------- | ---------------------- | ----------------------------------------------------------- |
| Successful upload | "Active uploads" panel | per-file row with progress bar + Synced badge + View button |
| Failed upload     | retry button on row    | upload-retry-{id} reissues the upload                       |

## Network calls expected during normal use

| trigger              | method | path                    | what request body or query is expected                              |
| -------------------- | ------ | ----------------------- | ------------------------------------------------------------------- |
| File queued          | POST   | /api/uploads            | multipart/form-data; returns `{ id, storage_key, mime_type, size }` |
| After bytes uploaded | POST   | /api/files              | `{ name, mime_type, size, storage_key }` returns 201 with file id   |
| Test verification    | GET    | /api/files/:id/download | streams the original bytes back                                     |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/upload.spec.ts`
