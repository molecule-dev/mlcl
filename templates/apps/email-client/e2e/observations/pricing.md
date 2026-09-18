# Page observations: /pricing (Pricing)

> Filled by the dispatch-flagship agent driving the running app via Playwright MCP.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                 | role                       | expected behavior on interaction                   | success signal                     | failure signal  |
| ------------------------------------------ | -------------------------- | -------------------------------------------------- | ---------------------------------- | --------------- |
| `getByRole("heading", { name: /pricing     | plans/i })`                | heading                                            | renders Pricing heading            | visible heading | placeholder heading |
| tier card (each plan: free, pro, business) | region                     | shows price + feature list from /api/billing/tiers | ≥ 1 tier card visible with $-price | empty cards     |
| `getByRole("button"                        | "link", { name: /sign\s*up | get\s*started                                      | choose                             | select/i })`    | button/link         | starts plan selection (signup or checkout) | URL navigates | nothing happens |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | (none)        | (none)                                       |

## Network calls expected during normal use

| trigger   | method | path               | what request body or query is expected |
| --------- | ------ | ------------------ | -------------------------------------- |
| Page load | GET    | /api/billing/tiers | empty body                             |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/pricing.spec.ts`
