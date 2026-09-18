# Page observations: /statements (Statements)

Source: live walk via Playwright + e2e/statements.spec.ts.

## Page state assumed

- [x] Authenticated.

## Elements

| selector / accessible name                                        | role    | expected behavior on interaction                                         | success signal                      | failure signal         |
| ----------------------------------------------------------------- | ------- | ------------------------------------------------------------------------ | ----------------------------------- | ---------------------- |
| `getByRole('heading', { name: /statements/i, level: 1 })`         | heading | h1 renders                                                               | visible                             | missing                |
| Eyebrow "Documents"                                               | text    | uppercase eyebrow above h1                                               | visible                             | missing                |
| Subheading "Monthly summaries…"                                   | text    | descriptive subline below h1                                             | visible                             | missing                |
| Empty-state "No statements available yet."                        | text    | renders for a brand-new user                                             | visible                             | wrong copy / fake list |
| Total-count chip (`{{count}} statements`)                         | text    | once statements exist, chip shows the row count                          | matches API count                   | wrong number           |
| Accounts-count chip (`{{count}} accounts`)                        | text    | unique account_id count chip                                             | matches distinct account ids        | wrong number           |
| Size chip (e.g. `2.1MB`)                                          | text    | sums size_bytes across rows                                              | string non-empty                    | absent                 |
| Statement row (`<li>`): period heading + account_name · ••••last4 | list    | renders one `<li>` per statement                                         | row count matches API               | mismatch               |
| Statement row size string                                         | text    | fmtSize() of size_bytes                                                  | non-empty                           | absent                 |
| `Download PDF` link (`<a href={download_url}>`)                   | link    | href points to /api/statements/:id/download which returns 200 attachment | response 200 with attachment header | 404/500                |

## Hidden surfaces opened from this page

| trigger                            | what it opens | elements inside (selector / role / behavior) |
| ---------------------------------- | ------------- | -------------------------------------------- |
| (none — pure list view; no modals) | —             | —                                            |

## Network calls expected during normal use

| trigger            | method | path                         | what request body or query is expected                                              |
| ------------------ | ------ | ---------------------------- | ----------------------------------------------------------------------------------- |
| initial load       | GET    | /api/statements              | 200 with array of shaped statement rows (period_*_iso, account_last4, download_url) |
| Download PDF click | GET    | /api/statements/:id/download | 200 application/octet-stream attachment                                             |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/statements.spec.ts`
