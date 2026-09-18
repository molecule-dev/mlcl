# Page observations: /trash (Trash)

> Filled from a live walk via Playwright MCP at /trash.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name | role     | expected behavior on interaction          | success signal                                | failure signal         |
| -------------------------- | -------- | ----------------------------------------- | --------------------------------------------- | ---------------------- |
| Page heading "Trash"       | heading  | render page chrome                        | visible                                       | not visible            |
| Trashed file row           | listitem | shows files with `is_trashed=true`        | row visible after DELETE /api/files/:id       | row missing            |
| Restore button             | button   | POST /api/files/:id/restore               | row reappears in default `/api/files` list    | row stays trashed      |
| Permanent delete button    | button   | DELETE /api/files/:id with permanent=true | row removed from trash and S3 object scrubbed | row remains            |
| Empty-state message        | text     | "Trash is empty" copy when no rows        | visible when trash is empty                   | hidden when rows exist |

## Hidden surfaces opened from this page

| trigger                  | what it opens       | elements inside (selector / role / behavior)              |
| ------------------------ | ------------------- | --------------------------------------------------------- |
| Permanent-delete confirm | confirmation dialog | confirm/cancel buttons; confirm triggers permanent DELETE |

## Network calls expected during normal use

| trigger          | method | path                   | what request body or query is expected               |
| ---------------- | ------ | ---------------------- | ---------------------------------------------------- |
| Page load        | GET    | /api/files?trash=true  | `Array<FileRecord>` of trashed files                 |
| Restore          | POST   | /api/files/:id/restore | 200 with restored row                                |
| Permanent delete | DELETE | /api/files/:id         | 200/204; S3 object also deleted via the uploads bond |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/trash.spec.ts`
