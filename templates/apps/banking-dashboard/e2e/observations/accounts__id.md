# Page observations: /accounts/:id (AccountDetail)

Source: live walk via Playwright + e2e/accounts__id.spec.ts.

## Page state assumed

- [x] Authenticated; visited via `/accounts/<id>` for an account the
      current user owns.

## Elements

| selector / accessible name                                        | role               | expected behavior on interaction                                    | success signal                | failure signal     |
| ----------------------------------------------------------------- | ------------------ | ------------------------------------------------------------------- | ----------------------------- | ------------------ |
| `getByRole('link', { name: /all accounts/i })` ("← All accounts") | link               | navigates back to /accounts                                         | URL becomes /accounts         | URL unchanged      |
| Hero header (kind · last4 + active badge)                         | section            | renders the account name + kind + last-4 mask                       | name + masked digits visible  | header missing     |
| Big balance figure                                                | text               | renders balance_cents formatted as currency                         | money string matches API      | wrong / blank      |
| Available subline                                                 | text               | renders `{{amount}} available`                                      | matches available_cents       | wrong number       |
| Decorative sparkline `<svg>`                                      | image (decorative) | present for visual flair, aria-hidden                               | svg in DOM                    | absent             |
| Transactions section heading                                      | heading            | renders "Transactions"                                              | visible                       | missing            |
| Posted-count chip (when txs exist)                                | text               | renders `{{count}} posted` chip                                     | matches posted count from API | wrong count        |
| Pending-count chip (when pending txs exist)                       | text               | renders `{{count}} pending` chip when applicable                    | matches pending count         | wrong count        |
| Empty-state "No transactions yet."                                | text               | renders for an account with zero ledger rows                        | visible                       | wrong copy         |
| Tx row description / category / date / amount                     | list               | renders one `<li>` per bank_transactions row scoped to this account | row count matches API filter  | mismatch           |
| Unknown-id route guard ("This account is no longer available.")   | text               | navigating to /accounts/<random-uuid> shows the unavailable copy    | message visible               | white screen / 500 |

## Hidden surfaces opened from this page

| trigger                              | what it opens | elements inside (selector / role / behavior) |
| ------------------------------------ | ------------- | -------------------------------------------- |
| (none — pure detail view; no modals) | —             | —                                            |

## Network calls expected during normal use

| trigger      | method | path              | what request body or query is expected                |
| ------------ | ------ | ----------------- | ----------------------------------------------------- |
| initial load | GET    | /api/accounts/:id | 200 with account row (or 404 if id not owned)         |
| initial load | GET    | /api/transactions | 200 with all-tx array; client filters to this account |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/accounts__id.spec.ts`
