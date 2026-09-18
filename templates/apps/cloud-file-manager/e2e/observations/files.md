# Page observations: /files (My Files)

> Filled from a live walk via Playwright MCP at /files.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name             | role    | expected behavior on interaction | success signal         | failure signal              |
| -------------------------------------- | ------- | -------------------------------- | ---------------------- | --------------------------- |
| Welcome hero "Welcome back"            | heading | new account empty state          | visible on first visit | hidden when there are files |
| Empty-state message "No files yet"     | text    | empty-list copy                  | visible on empty list  | hidden when files exist     |
| `a[href="/upload"]` (Upload)           | link    | navigate to /upload              | URL becomes /upload    | nav fails                   |
| `a[href="/starred"]` (sidebar Starred) | link    | navigate to /starred             | URL becomes /starred   | nav fails                   |
| `a[href="/trash"]` (sidebar Trash)     | link    | navigate to /trash               | URL becomes /trash     | nav fails                   |
| File row link `/files/:id`             | link    | navigate to FileDetail           | URL becomes /files/:id | nav fails                   |

## Hidden surfaces opened from this page

| trigger                            | what it opens | elements inside (selector / role / behavior) |
| ---------------------------------- | ------------- | -------------------------------------------- |
| (none — sidebar is always visible) | —             | —                                            |

## Network calls expected during normal use

| trigger                     | method | path         | what request body or query is expected                       |
| --------------------------- | ------ | ------------ | ------------------------------------------------------------ |
| Page load                   | GET    | /api/files   | `Array<FileRecord>` of the user's non-trash files            |
| Page load                   | GET    | /api/folders | `Array<FolderRecord>`                                        |
| New file POST (test path)   | POST   | /api/files   | `{ name, mime_type, size, storage_key }` returns 201 with id |
| New folder POST (test path) | POST   | /api/folders | `{ name }` returns 201                                       |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/files.spec.ts`
