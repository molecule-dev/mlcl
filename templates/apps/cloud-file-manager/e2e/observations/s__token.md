# Page observations: /s/:token (Share public viewer)

> Filled from a live walk via Playwright MCP at /s/:token.

## Page state assumed

- [x] Public — any visitor can resolve a non-expired share token without signing in

## Elements

| selector / accessible name                                     | role    | expected behavior on interaction             | success signal                             | failure signal                                            |
| -------------------------------------------------------------- | ------- | -------------------------------------------- | ------------------------------------------ | --------------------------------------------------------- |
| Heading "A file has been shared with you"                      | heading | render top of the share viewer               | visible after metadata resolves            | hidden when token is invalid                              |
| `[data-mol-id="share-public-loading"]`                         | text    | shows while metadata resolves                | visible until network round-trip completes | never appears                                             |
| `[data-mol-id="share-public-error"]`                           | alert   | rendered when token is invalid / expired     | visible message                            | shows file metadata for a bad token (security regression) |
| `[data-mol-id^="share-public-file-"]`                          | article | renders file name, mime, size, permission    | visible for valid token                    | missing for valid token                                   |
| `[data-mol-id="share-public-download"]`                        | link    | href is `/api/shares/public/:token/download` | response streams bytes anonymously         | href missing or 401                                       |
| `[data-mol-id="share-public-home-link"]` (Back to Nimbus home) | link    | navigate to /                                | URL becomes /                              | nav fails                                                 |

## Hidden surfaces opened from this page

| trigger                       | what it opens | elements inside (selector / role / behavior) |
| ----------------------------- | ------------- | -------------------------------------------- |
| (none — single-screen viewer) | —             | —                                            |

## Network calls expected during normal use

| trigger        | method | path                               | what request body or query is expected                                           |
| -------------- | ------ | ---------------------------------- | -------------------------------------------------------------------------------- |
| Page load      | GET    | /api/shares/public/:token          | `{ file, permission, expires_at, download_path }` for valid token; 404 otherwise |
| Download click | GET    | /api/shares/public/:token/download | streams the original file bytes (cookie not required)                            |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/s__token.spec.ts`
