# Page observations: /orders/history (OrderHistory)

> Authenticated — historical orders ledger. Heading "Order history",
> a "Total in view" badge (sums the rows on screen), and a paginated
> ticket table with id / table / total / status / created-at columns.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                                                                | role           | expected behavior on interaction                                           | success signal                                           | failure signal                     |
| ----------------------------------------------------------------------------------------- | -------------- | -------------------------------------------------------------------------- | -------------------------------------------------------- | ---------------------------------- |
| `getByRole('heading', { name: /order history/i })` + `[data-testid="orderhistory-total"]` | heading + text | heading + Total badge always rendered (badge reads $0.00 in empty state)   | both visible on page load                                | heading missing or badge absent    |
| ticket-row totals                                                                         | text           | a paid order shows up in the table with its total dollar value             | the new ticket id + dollar total visible                 | order missing from table           |
| `?limit=` pagination                                                                      | (URL param)    | GET /api/orders honours `?limit=N` — the visible row count never exceeds N | server returns ≤ N orders for `limit=N`                  | server returns more than N rows    |
| total badge sum                                                                           | text           | the badge sums the totals of the rows currently visible on screen          | badge dollar value matches the sum of visible row totals | badge value drifts from row totals |

## Hidden surfaces opened from this page

| trigger         | what it opens | elements inside |
| --------------- | ------------- | --------------- |
| (none observed) | n/a           | n/a             |

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
- [x] All elements above have a corresponding test in `e2e/21-orders_history.spec.ts`
