# Page observations: /transfers (Transfers)

Source: live walk via Playwright + e2e/transfers.spec.ts. Submits a
new transfer via POST /api/transfers and (when the source account has
funds) updates account balances + writes ledger rows server-side.

## Page state assumed

- [x] Authenticated; ideally with at least one bank account seeded.

## Elements

| selector / accessible name                                | role       | expected behavior on interaction                                             | success signal                                                                                                | failure signal           |
| --------------------------------------------------------- | ---------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- | ------------------------ |
| `getByRole('heading', { name: /move money/i, level: 1 })` | heading    | h1 renders                                                                   | visible                                                                                                       | missing                  |
| `[data-mol-id="transfers-status"]`                        | status     | aria-live region with idle/submitting/submitted text                         | visible with idle copy                                                                                        | absent                   |
| `select[value=from]` (From account)                       | combobox   | lists the user's bank accounts; defaults to first                            | populated with options                                                                                        | empty / disabled         |
| Toggle "Another account"                                  | button     | switches recipient picker to accounts list; bumps `data-to-type-tick`        | data-to-type-tick increments                                                                                  | inert                    |
| Toggle "A recipient"                                      | button     | switches recipient picker to saved recipients; bumps tick                    | data-to-type-tick increments                                                                                  | inert                    |
| `select[value=to]` (To account / recipient)               | combobox   | lists the alternate destinations; default placeholder "Select…"              | options match toggle state                                                                                    | always empty             |
| `input[type=number]` (amount)                             | spinbutton | accepts a $ amount with step=0.01                                            | input fills                                                                                                   | absent                   |
| `input[type=text]` (memo)                                 | textbox    | optional description                                                         | input fills                                                                                                   | absent                   |
| `form button[type=submit]` (Schedule transfer · $X)       | button     | submit triggers POST /api/transfers; insufficient_funds renders inline error | network capture shows POST; status flips to "Transfer scheduled" or `[data-mol-id="transfers-error"]` appears | request never fires      |
| `[data-mol-id="transfers-error"]`                         | alert      | renders when POST returns 4xx                                                | visible with error text                                                                                       | error swallowed silently |

## Hidden surfaces opened from this page

| trigger                                                                      | what it opens | elements inside (selector / role / behavior) |
| ---------------------------------------------------------------------------- | ------------- | -------------------------------------------- |
| (none — single inline form; success/error messages are siblings, not modals) | —             | —                                            |

## Network calls expected during normal use

| trigger      | method | path            | what request body or query is expected                                         |
| ------------ | ------ | --------------- | ------------------------------------------------------------------------------ |
| initial load | GET    | /api/accounts   | 200 with array of accounts                                                     |
| initial load | GET    | /api/recipients | 200 with array of saved recipients                                             |
| submit       | POST   | /api/transfers  | { from_account_id, to_account_id?\|recipient_id?, amount_cents, description? } |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/transfers.spec.ts`
