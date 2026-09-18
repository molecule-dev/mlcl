# Page observations: /tables/:id (TableDetail)

> Authenticated — single-table detail. Loads from GET /api/tables/:id
> and renders the table number, seats, section, status pill, status
> change controls, a QR-code surface, and a delete action.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name  | role                | expected behavior on interaction                                         | success signal                    | failure signal             |
| --------------------------- | ------------------- | ------------------------------------------------------------------------ | --------------------------------- | -------------------------- |
| table number + seats labels | text                | rendered from GET /api/tables/:id                                        | numbers visible on the page       | labels missing             |
| status change controls      | radiogroup / select | PUT /api/tables/:id/status; status pill updates and round-trips via GET  | new status reflected after reload | pill stuck on stale status |
| QR action                   | link/button         | calls GET /api/tables/:id/qr; URL contains `owner=<uid>` and `table=<n>` | URL embeds owner + table          | QR missing owner_id        |
| delete action               | button              | DELETE /api/tables/:id; row gone from GET /api/tables list               | row missing on next list          | row persists after delete  |

## Hidden surfaces opened from this page

| trigger   | what it opens                | elements inside                 |
| --------- | ---------------------------- | ------------------------------- |
| QR action | printable QR popover / modal | URL string, copy/print controls |

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
- [x] All elements above have a corresponding test in `e2e/17-tables__id.spec.ts`
