# Page observations: /pricing (Pricing)

> Filled from a live walk via Playwright MCP at /pricing. Re-walk if any
> visible element changes; do not edit from imagination.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name            | role    | expected behavior on interaction | success signal  | failure signal                                               |
| ------------------------------------- | ------- | -------------------------------- | --------------- | ------------------------------------------------------------ |
| `getByRole('heading')` (Pricing)      | heading | render the pricing heading       | heading visible | page blank                                                   |
| `getByText(/items                     | vaults  | members/i)` (limits per tier)    | text            | render per-tier item/vault counts                            | numeric limits visible per card   | limits missing                           |
| `getByRole('button', { name: /upgrade | choose  | get started/i })`                | button          | POST /api/billing/checkout for paid tier; redirect to Stripe | browser navigates to checkout URL | no POST / button disabled with no reason |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | —             | —                                            |

## Network calls expected during normal use

| trigger       | method | path                  | what request body or query is expected            |
| ------------- | ------ | --------------------- | ------------------------------------------------- |
| page mount    | GET    | /api/billing/tiers    | returns 3 tiers with stripePriceId for paid ones  |
| Upgrade click | POST   | /api/billing/checkout | `{ priceKey }` returns Stripe-hosted checkout URL |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in the matching spec
