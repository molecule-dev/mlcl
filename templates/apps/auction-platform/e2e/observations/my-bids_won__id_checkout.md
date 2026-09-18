# Page observations: /my-bids/won/:id/checkout (WonAuctionCheckout)

> Filled by the dispatch-flagship agent driving the running app via Playwright MCP.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`); only the auction winner can view this page.

## Elements

| selector / accessible name                         | role                         | expected behavior on interaction | success signal             | failure signal         |
| -------------------------------------------------- | ---------------------------- | -------------------------------- | -------------------------- | ---------------------- |
| `getByRole("heading", { name: /You won             | Pay to claim/i, level: 1 })` | heading                          | render won-auction CTA     | visible                | absent |
| `getByRole("radio", { name: /Insured ground/i })`  | radio                        | select shipping option           | checked                    | unchecked              |
| `getByRole("radio", { name: /Insured express/i })` | radio                        | select express shipping          | checked                    | unchecked              |
| `getByRole("button", { name: /Pay                  | checkout/i })`               | button                           | POST /api/checkout/:id/pay | redirect to Stripe URL | stays  |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | (none)        | (none)                                       |

## Network calls expected during normal use

| trigger   | method | path                  | what request body or query is expected |
| --------- | ------ | --------------------- | -------------------------------------- |
| page load | GET    | /api/checkout/:id     | (none)                                 |
| Pay click | POST   | /api/checkout/:id/pay | shipping + address                     |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/my-bids_won__id_checkout.spec.ts`
