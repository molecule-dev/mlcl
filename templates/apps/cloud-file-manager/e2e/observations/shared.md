# Page observations: /shared (Shared with Me)

> Filled from a live walk via Playwright MCP at /shared.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name    | role     | expected behavior on interaction      | success signal                   | failure signal             |
| ----------------------------- | -------- | ------------------------------------- | -------------------------------- | -------------------------- |
| Page heading "Shared with me" | heading  | render page chrome                    | visible                          | not visible                |
| Empty-state message           | text     | "Nothing has been shared with you"    | visible when there are no shares | hidden once a share exists |
| Shared file row               | listitem | files where the user is a recipient   | visible after share is created   | missing                    |
| File row link                 | link     | navigate to /files/:id when permitted | URL becomes /files/:id           | nav fails                  |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | —             | —                                            |

## Network calls expected during normal use

| trigger   | method | path                                        | what request body or query is expected    |
| --------- | ------ | ------------------------------------------- | ----------------------------------------- |
| Page load | GET    | /api/shares?recipient=true (or /api/shares) | `Array<ShareRecord>` shared with the user |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/shared.spec.ts`
