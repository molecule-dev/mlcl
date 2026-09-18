# Page observations: /storage (Storage)

> Filled from a live walk via Playwright MCP at /storage.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name | role          | expected behavior on interaction   | success signal                       | failure signal                   |
| -------------------------- | ------------- | ---------------------------------- | ------------------------------------ | -------------------------------- |
| Page heading "Storage"     | heading       | renders the page chrome            | visible                              | not visible                      |
| Used / quota counter       | text          | shows usage in human-readable form | visible numeric value                | renders 0 even after files exist |
| Breakdown chart            | region        | per-mime breakdown of usage        | rendered after /api/storage resolves | data missing                     |
| Manage storage CTA         | link / button | navigate to /pricing for upgrade   | URL becomes /pricing                 | nav fails                        |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | —             | —                                            |

## Network calls expected during normal use

| trigger   | method | path         | what request body or query is expected                                                          |
| --------- | ------ | ------------ | ----------------------------------------------------------------------------------------------- |
| Page load | GET    | /api/storage | `{ usedBytes: number, breakdown: { documents, images, videos, archives, code, audio, other } }` |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/storage.spec.ts`
