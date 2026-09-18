# Page observations: /invoices/:id (Invoice detail)

> Filled by AI agent driving the running smoke app on 3020/4020 with a
> headless playwright walk (see `scripts/_tt-walk-pages.mjs`), then
> re-validated by `e2e/invoices__id.spec.ts`. Snapshot raw output at
> `.observe/time-tracking/invoices__id.snapshot.txt`.

> Auth-protected detail view of a single invoice. Shows breadcrumb,
> invoice number heading, status pill, and three primary actions
> (Print / PDF, Send to client, Mark paid). Body contains bill-to /
> issued / due / line items / subtotal / total / notes.

## Procedure

1. Sign up first via `signup(page)`, then seed a client + project + entry
   - invoice via the API helpers in `_helpers.ts`.
2. `mcp__playwright__browser_navigate` → `/invoices/:invoice_id`
3. `mcp__playwright__browser_snapshot` → walk every interactive node.
4. Click each action button (Print, Send, Mark paid) → re-snapshot to
   capture downloaded PDF / status transitions.
5. Re-pass: navigate again, confirm no new elements appear.
6. Author `e2e/invoices__id.spec.ts`.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`).
- [x] Seeded: a client, a billable project under it, an entry, and an invoice
      created from that entry.

## Elements

| selector / accessible name                           | role      | expected behavior on interaction                                        | success signal                                    | failure signal |
| ---------------------------------------------------- | --------- | ----------------------------------------------------------------------- | ------------------------------------------------- | -------------- |
| `[data-test=invoice-detail]`                         | container | renders the detail root                                                 | element visible                                   | missing        |
| breadcrumb `link "Invoices"`                         | link      | navigates back to /invoices                                             | URL ends `/invoices`                              | no nav         |
| `heading "INV-..."` (h1)                             | heading   | invoice number visible                                                  | h1 visible                                        | missing        |
| status pill                                          | text      | shows invoice.status (Draft / Sent / Paid / Overdue) with matching icon | pill visible                                      | missing        |
| `[data-test=invoice-pdf]`                            | button    | "Print / PDF" — opens browser print dialog scoped to the invoice        | window.print invocation captured                  | no-op          |
| `[data-test=invoice-send]`                           | button    | "Send to client" — POST /api/invoices/:id/send (status → sent)          | row updates to Sent + status pill flips           | error / no-op  |
| `[data-test=invoice-mark-paid]`                      | button    | "Mark paid" — POST /api/invoices/:id/mark-paid (status → paid)          | row updates to Paid + KPIs roll up to Paid bucket | error / no-op  |
| Bill-to block                                        | text      | shows client name + email                                               | text visible                                      | missing        |
| Issued / Due dates                                   | text      | localized issue + due dates                                             | dates visible                                     | missing        |
| Line item rows                                       | text      | description / hours / rate / amount per source entry                    | rows visible                                      | missing        |
| `[data-test=invoice-total]` (Subtotal / Tax / Total) | text      | dollar totals computed from line items                                  | $ amounts visible, total = sum                    | wrong total    |
| Notes block                                          | text      | invoice notes (free-text from creation)                                 | notes visible if set                              | missing        |

## Hidden surfaces opened from this page

| trigger       | what it opens                              | elements inside (selector / role / behavior) |
| ------------- | ------------------------------------------ | -------------------------------------------- |
| `invoice-pdf` | browser native print dialog (window.print) | n/a (host-handled)                           |

## Network calls expected during normal use

| trigger                   | method | path                        | what request body or query is expected                   |
| ------------------------- | ------ | --------------------------- | -------------------------------------------------------- |
| load                      | GET    | /api/invoices/:id           | full invoice with line items + client snapshot           |
| `invoice-send` click      | POST   | /api/invoices/:id/send      | server flips status → sent, persists email-out timestamp |
| `invoice-mark-paid` click | POST   | /api/invoices/:id/mark-paid | server flips status → paid, persists paid_at             |
| breadcrumb back           | (nav)  | /invoices                   | reload list                                              |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/invoices__id.spec.ts`
