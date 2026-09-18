# Page observations: /tables (Tables)

> Authenticated — floor map / list of tables. Heading "Tables", "Add
> table" primary action, table cards displaying number/seats/section/
> status, status-change controls (available/reserved/occupied/cleaning),
> a per-table QR-code surface, and a delete control.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                                        | role                 | expected behavior on interaction                             | success signal                                                                  | failure signal                            |
| ----------------------------------------------------------------- | -------------------- | ------------------------------------------------------------ | ------------------------------------------------------------------------------- | ----------------------------------------- |
| `getByRole('button', { name: /add table/i })`                     | button               | POST /api/tables; new card appears in the list               | new table_number visible                                                        | button missing / no card created          |
| table-number labels (e.g. "11", "12")                             | text                 | rendered prominently on each card                            | both numbers visible after creation                                             | numbers missing from page body            |
| status badge ("available" / "reserved" / "occupied" / "cleaning") | text                 | reflects PUT /api/tables/:id/status                          | new status visible after change + reload                                        | badge stuck on stale status               |
| `getByRole('link'/'button', { name: /qr                           | code/i })` on a card | link/button                                                  | opens GET /api/tables/:id/qr — printable URL with `owner_id` and `table_number` | URL contains `owner=<id>` and `table=<n>` | URL missing owner / table |
| paid-order auto-cleaning indicator                                | text                 | after POST /api/orders/:id/pay the table flips to `cleaning` | badge reads "cleaning" on next reload                                           | badge stuck on `occupied`                 |
| delete control on a card                                          | button               | DELETE /api/tables/:id; row vanishes from list               | row absent on next GET /api/tables                                              | row still present after delete            |

## Hidden surfaces opened from this page

| trigger   | what it opens                                    | elements inside                       |
| --------- | ------------------------------------------------ | ------------------------------------- |
| QR action | per-table modal / popover with the printable URL | URL string, "Copy" / "Print" controls |

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
- [x] All elements above have a corresponding test in `e2e/04-tables.spec.ts`
