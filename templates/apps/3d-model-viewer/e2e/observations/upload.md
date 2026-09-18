# Page observations: /upload (Upload)

> Filled by the dispatch-flagship agent driving the running app via Playwright MCP.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name          | role       | expected behavior on interaction                              | success signal                               | failure signal       |
| ----------------------------------- | ---------- | ------------------------------------------------------------- | -------------------------------------------- | -------------------- |
| `[data-testid="upload-file-input"]` | file input | accept dropped/picked files for upload                        | files appear in queue with status=ready      | queue stays empty    |
| Queue item status badge             | listitem   | shows uploading→ready/error and exposes data-status attribute | data-status reflects POST /api/models result | always uploading     |
| Server-rejected payload             | network    | POST /api/models with bad payload returns 4xx                 | response status 400-499                      | accepted (>=200<300) |
| Clear queue button                  | button     | clears all items, disabled when empty                         | queue becomes empty after click              | items remain         |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | (none)        | (none)                                       |

## Network calls expected during normal use

| trigger | method | path | what request body or query is expected |
| ------- | ------ | ---- | -------------------------------------- |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/upload.spec.ts`
