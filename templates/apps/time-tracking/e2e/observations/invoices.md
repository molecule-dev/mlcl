# Page observations: /invoices (Invoices)

> Filled by AI agent driving the running smoke app on 3020/4020 with a
> headless playwright walk (see `scripts/_tt-walk-pages.mjs`), then
> re-validated by `e2e/invoices.spec.ts`. Snapshot raw output at
> `.observe/time-tracking/invoices.snapshot.txt`.

> Auth-protected list of invoices. Header KPIs roll up
> Outstanding / Overdue / Paid (last 30d) / Drafts. The "New invoice"
> toggle reveals an inline form (Client + Due date + Notes). Each row
> links to /invoices/:id.

## Procedure

1. Sign up first via `signup(page)` (route is auth-protected).
2. `mcp__playwright__browser_navigate` → `/invoices`
3. `mcp__playwright__browser_snapshot` → walk every interactive node.
4. Click "New invoice" toggle → re-snapshot the open form.
5. Re-pass: navigate again, confirm no new elements appear.
6. Author `e2e/invoices.spec.ts`.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`).

## Elements

| selector / accessible name                    | role           | expected behavior on interaction                                         | success signal                                 | failure signal    |
| --------------------------------------------- | -------------- | ------------------------------------------------------------------------ | ---------------------------------------------- | ----------------- |
| `[data-test=invoices-page]`                   | container      | renders the invoices root                                                | element visible                                | missing           |
| `heading "Invoices"` (h1)                     | heading        | page title visible                                                       | h1 visible                                     | missing           |
| KPI card "Outstanding"                        | text           | sum of `total_cents` of open (sent, not paid, not overdue) invoices      | dollar amount visible                          | empty             |
| KPI card "Overdue"                            | text           | sum of `total_cents` past due_at and not paid                            | dollar amount visible                          | empty             |
| KPI card "Paid · last 30d"                    | text           | sum of paid invoices issued in last 30 days                              | dollar amount visible                          | empty             |
| KPI card "Drafts"                             | text           | count of draft-status invoices                                           | numeric value visible                          | empty             |
| `[data-test=new-invoice-toggle]`              | button         | reveals the inline create-invoice form                                   | `[data-test=new-invoice-form]` becomes visible | form missing      |
| `[data-test=new-invoice-form]` (after toggle) | form           | wraps the create-invoice fields and submit                               | element visible after toggle                   | missing           |
| `[data-test=invoice-client]`                  | combobox       | select a client (required, from user's clients)                          | options include each existing client           | empty options     |
| `[data-test=invoice-due]`                     | textbox (date) | due date picker (required)                                               | accepts ISO-formatted date                     | rejects           |
| `[data-test=invoice-notes]`                   | textarea       | optional invoice memo                                                    | typed value preserved                          | missing           |
| `[data-test=invoice-submit]`                  | button         | POST /api/invoices, creates draft invoice from client's billable entries | new row appears + KPI Drafts increments        | error toast / 4xx |
| `[data-test=invoice-row-:id]` (link)          | link           | navigates to /invoices/:id                                               | URL ends with the invoice id                   | no nav            |
| Invoice row text columns                      | text           | shows number / client / issued / due / amount / status                   | text visible per row                           | missing           |

## Hidden surfaces opened from this page

| trigger              | what it opens                                   | elements inside (selector / role / behavior)                                                                                         |
| -------------------- | ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `new-invoice-toggle` | inline create-invoice form (`new-invoice-form`) | `invoice-client` (select), `invoice-due` (date), `invoice-notes` (textarea), `invoice-submit` (button), `Cancel` (button hides form) |

## Network calls expected during normal use

| trigger     | method | path          | what request body or query is expected                                                   |
| ----------- | ------ | ------------- | ---------------------------------------------------------------------------------------- |
| load        | GET    | /api/invoices | invoices list scoped to current user                                                     |
| load        | GET    | /api/clients  | for the client picker in the form                                                        |
| submit form | POST   | /api/invoices | `{ client_id, due_at, notes }` (server picks billable un-invoiced entries automatically) |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/invoices.spec.ts`
