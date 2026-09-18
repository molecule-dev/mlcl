# Page observations: /starred (Starred)

> Filled from a live walk via Playwright MCP at /starred.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name | role     | expected behavior on interaction         | success signal                | failure signal         |
| -------------------------- | -------- | ---------------------------------------- | ----------------------------- | ---------------------- |
| Page heading "Starred"     | heading  | render page chrome                       | visible                       | not visible            |
| Starred file row           | listitem | only files with `is_starred=true` appear | row visible after star toggle | row missing            |
| File row link              | link     | navigate to /files/:id                   | URL becomes /files/:id        | nav fails              |
| Empty-state message        | text     | "Nothing starred yet" copy               | visible when no starred files | hidden when rows exist |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | —             | —                                            |

## Network calls expected during normal use

| trigger              | method | path                    | what request body or query is expected        |
| -------------------- | ------ | ----------------------- | --------------------------------------------- |
| Page load            | GET    | /api/files?starred=true | `Array<FileRecord>` of starred files          |
| Star (from any list) | POST   | /api/files/:id/star     | `{ is_starred: boolean }` returns updated row |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/starred.spec.ts`
