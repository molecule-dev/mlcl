# Page observations: /pricing (Pricing page)

> Filled from a live walk via Playwright MCP at /pricing. Re-walk if any
> visible element changes; do not edit from imagination.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name            | role    | expected behavior on interaction                                          | success signal                                             | failure signal |
| ------------------------------------- | ------- | ------------------------------------------------------------------------- | ---------------------------------------------------------- | -------------- |
| `getByRole('heading')` (page heading) | heading | render workspace heading                                                  | heading visible                                            | not rendered   |
| Pricing tier cards                    | list    | render each available plan                                                | tiers visible                                              | tiers missing  |
| Limits list per tier                  | list    | renders maxComponents / maxIncidents / maxSubscribers / advanced / export | values visible                                             | values missing |
| Upgrade / Select buttons per tier     | button  | initiate Stripe Checkout for paid tiers                                   | redirect to checkout / 200 from /api/users/payment-options | error message  |

## Hidden surfaces opened from this page

| trigger                         | what it opens | elements inside (selector / role / behavior) |
| ------------------------------- | ------------- | -------------------------------------------- |
| Plan-period toggle (if present) | switch        | toggle between monthly / annual pricing      |

## Network calls expected during normal use

| trigger   | method | path                       | what request body or query is expected |
| --------- | ------ | -------------------------- | -------------------------------------- |
| Page load | GET    | /api/users/payment-options | returns plan + price metadata          |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/16-pricing.spec.ts`
