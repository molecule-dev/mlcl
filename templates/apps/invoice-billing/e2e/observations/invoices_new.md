# Page observations: /invoices/new (InvoiceEditor)

> New-invoice editor. Fetches `GET /api/clients` to populate the
> client picker. Save draft POSTs to `/api/invoices` and navigates to
> the new `/invoices/:id` detail page. Send invoice POSTs the create
> followed by `POST /api/invoices/:id/send` (which flips status →
> `sent` and triggers the email send via the Mailgun bond).

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                        | role               | expected behavior on interaction                                            | success signal                                              | failure signal                      |
| ------------------------------------------------- | ------------------ | --------------------------------------------------------------------------- | ----------------------------------------------------------- | ----------------------------------- |
| `getByRole('heading', { name: /^New invoice$/ })` | heading            | static title                                                                | visible                                                     | missing                             |
| `getByRole('link', { name: /Back to invoices/ })` | link               | navigates to `/invoices`                                                    | URL ends `/invoices`                                        | stays                               |
| client picker (combobox or radio)                 | combobox           | required; selecting populates client_id                                     | value retained                                              | submit fails with "Client required" |
| `getByLabel(/Tax rate/)` (number input)           | spinbutton         | numeric tax_rate (0-100)                                                    | value retained                                              | non-numeric rejected                |
| `getByLabel(/Issue date/)`                        | textbox (date)     | optional                                                                    | value retained                                              | —                                   |
| `getByLabel(/Due date/)`                          | textbox (date)     | optional                                                                    | value retained                                              | —                                   |
| line-item Description / Qty / Rate inputs         | textbox/spinbutton | required per row                                                            | retained; running total updates                             | submit fails with "items required"  |
| `getByRole('button', { name: /Add item/ })`       | button             | appends a new line row                                                      | row count + 1                                               | no row added                        |
| `getByRole('button', { name: /Remove item/ })`    | button             | removes that line row                                                       | row count - 1                                               | nothing                             |
| `getByRole('button', { name: /^Save draft$/ })`   | button             | POST /api/invoices status=draft; navigates to `/invoices/:id`               | URL matches `/invoices/[uuid]`                              | stays / error                       |
| `getByRole('button', { name: /^Send invoice$/ })` | button             | POST /api/invoices then POST /api/invoices/:id/send; status flips to "sent" | URL matches `/invoices/[uuid]`; status badge "sent" visible | stays / error                       |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |

## Network calls expected during normal use

| trigger       | method | path                                           | what request body or query is expected                                |
| ------------- | ------ | ---------------------------------------------- | --------------------------------------------------------------------- |
| initial mount | GET    | /api/clients                                   | array of clients (used by picker)                                     |
| Save draft    | POST   | /api/invoices                                  | `{ client_id, items, due_date?, tax_rate?, … }` 201                   |
| Send invoice  | POST   | /api/invoices then POST /api/invoices/:id/send | first 201, second 200 with `{ status: 'sent', emailDelivered: bool }` |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/invoices_new.spec.ts`
