# Page observations: /recent (Recent)

> Filled from a live walk via Playwright MCP at /recent.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name            | role     | expected behavior on interaction                   | success signal           | failure signal         |
| ------------------------------------- | -------- | -------------------------------------------------- | ------------------------ | ---------------------- |
| Page heading "Recent"                 | heading  | render page chrome                                 | visible                  | not visible            |
| Recently uploaded / accessed file row | listitem | shows the user's recent files in last-update order | row visible after upload | row missing            |
| File row link                         | link     | navigate to /files/:id                             | URL becomes /files/:id   | nav fails              |
| Empty-state message                   | text     | "Nothing here yet" copy when no recent activity    | visible on empty state   | hidden when rows exist |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | —             | —                                            |

## Network calls expected during normal use

| trigger              | method | path          | what request body or query is expected         |
| -------------------- | ------ | ------------- | ---------------------------------------------- |
| Page load            | GET    | /api/files    | `Array<FileRecord>` ordered by updated_at desc |
| Page load (optional) | GET    | /api/activity | `Array<Activity>` for activity-based recency   |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/recent.spec.ts`
