# Page observations: /invoices/:id (InvoiceDetail)

> Per-invoice detail with hero card showing total + status badge,
> action bar (Send / Download PDF / Duplicate / Mark as paid / Void),
> bill-to + line items + totals, and the Timeline activity feed.
> Fetches: `GET /api/invoices/:id`, `GET /api/clients/:client_id`,
> `GET /api/payments?invoice_id=:id`.

## Page state assumed

- [x] Authenticated (sign up first; navigate from /invoices)

## Elements

| selector / accessible name                        | role    | expected behavior on interaction                                                               | success signal                                                           | failure signal  |
| ------------------------------------------------- | ------- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ | --------------- |
| `getByRole('link', { name: /Back to invoices/ })` | link    | navigates to `/invoices`                                                                       | URL ends `/invoices`                                                     | stays           |
| `[data-testid="invoice-number"]`                  | heading | shows INV-… number from API                                                                    | text matches `/^INV-/`                                                   | empty           |
| `[data-testid="invoice-total"]`                   | text    | currency-formatted total                                                                       | matches `\$[\d,.]+`                                                      | "$NaN" or empty |
| `getByRole('button', { name: /Send invoice/ })`   | button  | POSTs `/api/invoices/:id/send`; status flips to "sent" + sent_at populated                     | feedback "Invoice sent." visible; subsequent GET shows status=sent       | error banner    |
| `getByRole('button', { name: /Download PDF/ })`   | button  | opens `/api/invoices/:id/pdf` (HTML+download header) in new tab                                | response `Content-Type: text/html` AND `Content-Disposition: attachment` | no download     |
| `getByRole('button', { name: /Duplicate/ })`      | button  | POSTs `/api/invoices/:id/duplicate`; navigates to new draft                                    | URL changes to a different invoice id; new invoice exists in list        | no duplicate    |
| `getByRole('button', { name: /Mark as paid/ })`   | button  | POSTs `/api/payments` with `amount=balance,method=manual`; status flips to "paid" or "partial" | balance reads $0.00 after reload                                         | error banner    |
| `getByRole('button', { name: /^Void$/ })`         | button  | POSTs `/api/invoices/:id/void`; status flips to "void"                                         | feedback "Invoice voided." visible; status badge "void" after reload     | error banner    |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |

## Network calls expected during normal use

| trigger       | method | path                         | what request body or query is expected                    |
| ------------- | ------ | ---------------------------- | --------------------------------------------------------- |
| initial mount | GET    | /api/invoices/:id            | decorated invoice                                         |
| initial mount | GET    | /api/clients/:client_id      | client row (if invoice has client_id)                     |
| initial mount | GET    | /api/payments?invoice_id=:id | payments array                                            |
| Send          | POST   | /api/invoices/:id/send       | empty body; 200 with `{ status: 'sent', emailDelivered }` |
| Mark as paid  | POST   | /api/payments                | `{ invoice_id, amount, method, reference? }`; 201         |
| Void          | POST   | /api/invoices/:id/void       | empty body; 200                                           |
| Duplicate     | POST   | /api/invoices/:id/duplicate  | empty body; 201 with new invoice                          |
| Download PDF  | GET    | /api/invoices/:id/pdf        | 200, text/html, content-disposition attachment            |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/invoices__id.spec.ts`
