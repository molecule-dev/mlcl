# Page observations: /invoices (Invoices)

> Invoice list with status filter chips, search box, and CSV export.
> The free tier returns 402 from the export endpoint; pro+ tiers
> deliver the file. Status filter chips refetch the list with
> `?status=...` query.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                                  | role      | expected behavior on interaction                                     | success signal                                                    | failure signal     |
| ----------------------------------------------------------- | --------- | -------------------------------------------------------------------- | ----------------------------------------------------------------- | ------------------ |
| `getByRole('heading', { name: /^Invoices$/ })`              | heading   | static title                                                         | visible                                                           | missing            |
| `getByRole('link', { name: /^New invoice$/ })`              | link      | navigates to `/invoices/new`                                         | URL ends `/invoices/new`                                          | stays              |
| `getByRole('searchbox', { name: /Invoice # or client/ })`   | searchbox | filters visible rows by invoice number / client name                 | rows reduce to matching                                           | no filter          |
| `getByRole('button', { name: /^Draft$/ })` (status filter)  | button    | refetches with `?status=draft`, shows only matching rows             | `GET /api/invoices?status=draft` fired; rows match                | filter not applied |
| `getByRole('button', { name: /^Paid$/ })` (status filter)   | button    | refetches with `?status=paid`                                        | rows match                                                        | filter not applied |
| `getByRole('button', { name: /^Export CSV$/ })` (free tier) | button    | hits `/api/exports/invoices.csv`; free tier sees 402 paywall message | error message about upgrade visible OR CSV downloads on paid tier | silent no-op       |
| invoice row link to `/invoices/:id`                         | link      | navigates to invoice detail                                          | URL matches `/invoices/[uuid]`                                    | stays              |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |

## Network calls expected during normal use

| trigger                  | method | path                      | what request body or query is expected |
| ------------------------ | ------ | ------------------------- | -------------------------------------- |
| initial mount            | GET    | /api/invoices             | array of decorated invoice rows        |
| Status filter chip click | GET    | /api/invoices?status=…    | filtered array                         |
| Export CSV (free)        | GET    | /api/exports/invoices.csv | 402 with upgrade message               |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/invoices.spec.ts`
